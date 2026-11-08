// ============================================================
// บริการลงเวลาทำงาน — ดูประวัติ / ลงเวลาเข้า / ลงเวลาออก
// กติกา OT: คิดตอนลงเวลาออก = (ชั่วโมงทำงาน − พักเที่ยง 1 ชม.) − 8 ชม.
// เหลือติดลบถือเป็น 0 (เข้า-ออกวันเดียวกันเท่านั้น กัน UNIQUE ต่อวัน)
// ============================================================
import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

/** เวลาเข้างานปกติ — เข้าตั้งแต่ 08:00:00 หรือก่อน = ปกติ, เข้าหลังจากนั้น = เข้าสาย */
export const WORK_START_TIME = '08:00:00';

export interface AttendanceRecord {
  attendance_id: number;
  employee_id: number;
  employee_name: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: string | null;
  ot_hours: number;
  is_late: boolean;
}

export interface ClockInResult {
  attendance_id: number;
  employee_id: number;
  work_date: string;
  check_in: string;
  is_late: boolean;
}

export interface ClockOutResult extends ClockInResult {
  check_out: string;
  ot_hours: number;
}

// จัดรูปเวลาเป็น string ที่ PostgreSQL รับ (เวลาไทยจาก Date ของเครื่อง server)
const pad = (n: number) => String(n).padStart(2, '0');

/** Date → 'YYYY-MM-DD' (วันทำงาน) */
const asWorkDate = (now: Date) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/** Date → 'HH:MM:SS' (เวลาลงเวลา) */
const asClockTime = (now: Date) => `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

/**
 * คำนวณชั่วโมง OT จากเวลาเข้างานถึงเวลาปัจจุบัน
 * ชั่วโมงทำงาน = (ออก − เข้า) − พักเที่ยง 1 ชม. แล้วหัก 8 ชม.ปกติ — ติดลบ = 0
 * ปัดเป็นทศนิยม 2 ตำแหน่ง
 */
export function computeOtHours(checkIn: string, now: Date): number {
  const [h, m] = checkIn.split(':').map(Number);
  const inMin = h * 60 + m;
  const outMin = now.getHours() * 60 + now.getMinutes();
  const workedHours = Math.max(0, (outMin - inMin) / 60 - 1);
  return Math.max(0, Math.round((workedHours - 8) * 100) / 100);
}

/** ประวัติลงเวลาล่าสุด 200 แถว — worked_hours คิดใน SQL, is_late เทียบเวลาเข้ากับ 08:00 */
export async function listAttendance(scope: number | null): Promise<AttendanceRecord[]> {
  const { rows } = await pool.query<AttendanceRecord>(`
    SELECT  a.attendance_id,
            a.employee_id,
            e.first_name || ' ' || e.last_name AS employee_name,
            to_char(a.work_date, 'YYYY-MM-DD') AS work_date,
            to_char(a.check_in, 'HH24:MI')     AS check_in,
            COALESCE(to_char(a.check_out, 'HH24:MI'), '-') AS check_out,
            CASE WHEN a.check_out IS NULL THEN NULL
                 ELSE ROUND(GREATEST(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600 - 1, 0)::numeric, 2)
            END AS worked_hours,
            a.ot_hours,
            a.check_in > TIME '${WORK_START_TIME}' AS is_late
    FROM attendance a
    JOIN employees e USING (employee_id)
    ${scope ? 'WHERE a.employee_id = $1' : ''}
    ORDER BY a.work_date DESC, a.check_in DESC
    LIMIT 200
  `, scope ? [scope] : []);
  return rows;
}

/** ลงเวลาเข้าวันนี้ — ลงซ้ำวันเดียวกันไม่ได้ (ON CONFLICT DO NOTHING → ตรวจแถวว่าง = 409) */
export async function clockIn(employeeId: number, now: Date): Promise<ClockInResult> {
  const checkIn = asClockTime(now);
  try {
    const { rows } = await pool.query<ClockInResult>(
      `INSERT INTO attendance (employee_id, work_date, check_in)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, work_date) DO NOTHING
       RETURNING attendance_id, employee_id, work_date, check_in`,
      [employeeId, asWorkDate(now), checkIn]
    );
    if (rows.length === 0) throw new ServiceError(409, 'Already clocked in today');
    // เทียบเวลาเข้ากับเวลางานปกติ (string 'HH:MM:SS' เทียบกันได้ตรงๆ)
    return { ...rows[0], is_late: checkIn > WORK_START_TIME };
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    if (pgErrorCode(err) === '23503') {
      throw new ServiceError(400, 'Employee does not exist');
    }
    throw err;
  }
}

/** ลงเวลาออกวันนี้ + คิด OT อัตโนมัติ — ไม่เคยลงเข้า 404, ลงออกซ้ำ 409 */
export async function clockOut(employeeId: number, now: Date): Promise<ClockOutResult> {
  const { rows: existing } = await pool.query<{ attendance_id: number; check_in: string; check_out: string | null }>(
    'SELECT attendance_id, check_in, check_out FROM attendance WHERE employee_id = $1 AND work_date = $2',
    [employeeId, asWorkDate(now)]
  );
  const record = existing[0];
  if (!record) throw new ServiceError(404, 'No clock-in found for today');
  if (record.check_out !== null) throw new ServiceError(409, 'Already clocked out today');

  const { rows } = await pool.query<ClockOutResult>(
    'UPDATE attendance SET check_out = $1, ot_hours = $2 WHERE attendance_id = $3 RETURNING attendance_id, employee_id, work_date, check_in, check_out, ot_hours',
    [asClockTime(now), computeOtHours(String(record.check_in), now), record.attendance_id]
  );
  return rows[0];
}
