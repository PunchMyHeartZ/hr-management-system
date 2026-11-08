// ============================================================
// บริการเงินเดือน — ดู payslip / คำนวณทั้งเดือน / ตั้งโบนัสรายปี
// generateMonthlyPayroll รวบรวม OT (จาก attendance) + โบนัส (จาก bonuses)
// แล้วเรียก payrollEngine คำนวณ ทั้งหมดใน transaction เดียว
// ============================================================
import type { PoolClient } from 'pg';
import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';
// เครื่องคำนวณสูตรไทย (SSO/ภาษี/OT) — pure functions ไม่แตะ DB
import { computeMonthlyPayroll } from './payrollEngine';

export interface PayrollRecord {
  payroll_id: number;
  employee_id: number;
  employee_name: string;
  pay_period_year: number;
  pay_period_month: number;
  base_salary: string;
  ot_hours: number;
  ot_pay: string;
  bonus: string;
  sso: string;
  tax: string;
  net_pay: string;
}

/** template query ดู payslip — extraWhere ใช้เพิ่มเงื่อนไขกรองรายคน ($3 = scope) */
const PAYROLL_SELECT = (extraWhere = '') => `
  SELECT  p.payroll_id,
          p.employee_id,
          e.first_name || ' ' || e.last_name AS employee_name,
          p.pay_period_year,
          p.pay_period_month,
          p.base_salary,
          p.ot_hours,
          p.ot_pay,
          p.bonus,
          p.sso,
          p.tax,
          p.net_pay
  FROM payroll_records p
  JOIN employees e USING (employee_id)
  WHERE p.pay_period_year = $1 AND p.pay_period_month = $2 ${extraWhere}
  ORDER BY e.employee_id
`;

export interface BonusInput {
  employee_id: number;
  bonus_year: number;
  amount: number;
}

/** ดู payslip ของเดือน — scope = รหัสพนักงาน (เห็นของตัวเอง), null = ทั้งบริษัท */
export async function listPayslips(year: number, month: number, scope: number | null): Promise<PayrollRecord[]> {
  const { rows } = scope
    ? await pool.query<PayrollRecord>(PAYROLL_SELECT('AND p.employee_id = $3'), [year, month, scope])
    : await pool.query<PayrollRecord>(PAYROLL_SELECT(), [year, month]);
  return rows;
}

/** รวมชั่วโมง OT ของพนักงาน 1 คน ในเดือนนั้น (work_date ตกในช่วงเดือน y/m) */
async function monthlyOtHours(client: PoolClient, employeeId: number, year: number, month: number): Promise<number> {
  const { rows } = await client.query<{ ot: string }>(
    `SELECT COALESCE(SUM(ot_hours), 0) AS ot FROM attendance
     WHERE employee_id = $1
       AND work_date >= make_date($2, $3, 1)
       AND work_date <  make_date($2, $3, 1) + INTERVAL '1 month'`,
    [employeeId, year, month]
  );
  return Number(rows[0]?.ot) || 0;
}

/**
 * คำนวณเงินเดือนทั้งบริษัทสำหรับ 1 เดือน (เฉพาะพนักงาน status = 'active')
 * ทุกคนอยู่ใน transaction เดียว: คนใดคนหนึ่งพัง → ROLLBACK ทั้งชุด ไม่มีครึ่งๆ กลางๆ
 * ใช้ UPSERT (ON CONFLICT DO UPDATE) รองรับการกด generate ซ้ำเดือนเดิม
 */
export async function generateMonthlyPayroll(year: number, month: number): Promise<PayrollRecord[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: employees } = await client.query<{ employee_id: number; salary: string }>(
      "SELECT employee_id, salary FROM employees WHERE status = 'active' ORDER BY employee_id"
    );

    for (const employee of employees) {
      const otHours = await monthlyOtHours(client, employee.employee_id, year, month);

      const { rows: bonusRows } = await client.query<{ amount: string }>(
        'SELECT amount FROM bonuses WHERE employee_id = $1 AND bonus_year = $2',
        [employee.employee_id, year]
      );
      const annualBonus = bonusRows.length ? Number(bonusRows[0].amount) : 0;

      const { otPay, sso, tax, netPay } = computeMonthlyPayroll({
        salary: Number(employee.salary),
        otHours,
        annualBonus,
      });

      await client.query(
        `INSERT INTO payroll_records
           (employee_id, pay_period_year, pay_period_month,
            base_salary, ot_hours, ot_pay, bonus, sso, tax, net_pay)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (employee_id, pay_period_year, pay_period_month)
         DO UPDATE SET base_salary = $4, ot_hours = $5, ot_pay = $6,
                       bonus = $7, sso = $8, tax = $9, net_pay = $10,
                       created_at = NOW()`,
        [employee.employee_id, year, month, employee.salary, otHours, otPay, annualBonus, sso, tax, netPay]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return listPayslips(year, month, null);
}

/** ตั้งโบนัสรายปี (UPSERT ทับปีเดิมได้) — โบนัสจะถูกหักภาษีตอน generate payroll เดือนที่จ่าย */
export async function upsertBonus(input: BonusInput): Promise<{ bonus_id: number; employee_id: number; bonus_year: number; amount: string }> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO bonuses (employee_id, bonus_year, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, bonus_year) DO UPDATE SET amount = EXCLUDED.amount
       RETURNING bonus_id, employee_id, bonus_year, amount`,
      [input.employee_id, input.bonus_year, input.amount]
    );
    return rows[0];
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      throw new ServiceError(400, 'Employee does not exist');
    }
    throw err;
  }
}
