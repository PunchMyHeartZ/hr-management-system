import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

export interface AttendanceRecord {
  attendance_id: number;
  employee_id: number;
  employee_name: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: string | null;
  ot_hours: number;
}

export interface ClockInResult {
  attendance_id: number;
  employee_id: number;
  work_date: string;
  check_in: string;
}

export interface ClockOutResult extends ClockInResult {
  check_out: string;
  ot_hours: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

const asWorkDate = (now: Date) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const asClockTime = (now: Date) => `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

// OT = max(0, worked hours - 8), worked hours = (out - in) - 1h lunch break
export function computeOtHours(checkIn: string, now: Date): number {
  const [h, m] = checkIn.split(':').map(Number);
  const inMin = h * 60 + m;
  const outMin = now.getHours() * 60 + now.getMinutes();
  const workedHours = Math.max(0, (outMin - inMin) / 60 - 1);
  return Math.max(0, Math.round((workedHours - 8) * 100) / 100);
}

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
            a.ot_hours
    FROM attendance a
    JOIN employees e USING (employee_id)
    ${scope ? 'WHERE a.employee_id = $1' : ''}
    ORDER BY a.work_date DESC, a.check_in DESC
    LIMIT 200
  `, scope ? [scope] : []);
  return rows;
}

export async function clockIn(employeeId: number, now: Date): Promise<ClockInResult> {
  try {
    const { rows } = await pool.query<ClockInResult>(
      `INSERT INTO attendance (employee_id, work_date, check_in)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, work_date) DO NOTHING
       RETURNING attendance_id, employee_id, work_date, check_in`,
      [employeeId, asWorkDate(now), asClockTime(now)]
    );
    if (rows.length === 0) throw new ServiceError(409, 'Already clocked in today');
    return rows[0];
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    if (pgErrorCode(err) === '23503') {
      throw new ServiceError(400, 'Employee does not exist');
    }
    throw err;
  }
}

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
