import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { computeMonthlyPayroll } from '../payroll';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400, numericIdSchema } from '../validation';

const router = express.Router();

interface PayrollRow {
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

const yearSchema = z.preprocess(
  Number,
  z.number().int('Invalid year').min(2000, 'Invalid year').max(2100, 'Invalid year')
);

const monthSchema = z.preprocess(
  Number,
  z.number().int('Invalid month').min(1, 'Invalid month').max(12, 'Invalid month')
);

const generateSchema = z.object({ year: yearSchema, month: monthSchema });

const bonusSchema = z.object({
  employee_id: numericIdSchema('A valid employee is required'),
  bonus_year: yearSchema,
  amount: z.preprocess(
    Number,
    z.number().min(0, 'Amount must be a non-negative number')
  ),
});

// GET /api/payroll?year=2026&month=9&employee_id= - payslips for a month (employees see only their own)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const query = z.object({ year: yearSchema, month: monthSchema }).safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.issues[0]?.message ?? 'year and month are required' });
    return;
  }
  const scope = req.user?.role === 'employee' ? req.user.employeeId : Number(req.query.employee_id) || null;
  try {
    const { rows } = scope
      ? await pool.query<PayrollRow>(PAYROLL_SELECT('AND p.employee_id = $3'), [query.data.year, query.data.month, scope])
      : await pool.query<PayrollRow>(PAYROLL_SELECT(), [query.data.year, query.data.month]);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payroll:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// POST /api/payroll/generate { year, month }
// Computes payslips for all active employees from attendance OT + bonus,
// then upserts payroll_records.
router.post('/generate', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(generateSchema, req.body, res);
  if (!body) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: employees } = await client.query<{ employee_id: number; salary: string }>(
      "SELECT employee_id, salary FROM employees WHERE status = 'active' ORDER BY employee_id"
    );

    for (const e of employees) {
      const { rows: otRows } = await client.query<{ ot: string }>(
        `SELECT COALESCE(SUM(ot_hours), 0) AS ot FROM attendance
         WHERE employee_id = $1
           AND work_date >= make_date($2, $3, 1)
           AND work_date <  make_date($2, $3, 1) + INTERVAL '1 month'`,
        [e.employee_id, body.year, body.month]
      );
      const otHours = Number(otRows[0]?.ot) || 0;

      const { rows: bonusRows } = await client.query<{ amount: string }>(
        'SELECT amount FROM bonuses WHERE employee_id = $1 AND bonus_year = $2',
        [e.employee_id, body.year]
      );
      const annualBonus = bonusRows.length ? Number(bonusRows[0].amount) : 0;

      const { otPay, sso, tax, netPay } = computeMonthlyPayroll({
        salary: Number(e.salary),
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
        [e.employee_id, body.year, body.month, e.salary, otHours, otPay, annualBonus, sso, tax, netPay]
      );
    }

    await client.query('COMMIT');
    const { rows } = await pool.query<PayrollRow>(PAYROLL_SELECT(), [body.year, body.month]);
    res.status(201).json(rows);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/payroll/generate:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to generate payroll' });
  } finally {
    client.release();
  }
});

// PUT /api/payroll/bonus { employee_id, bonus_year, amount } - upsert annual bonus
router.put('/bonus', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(bonusSchema, req.body, res);
  if (!body) return;

  try {
    const { rows } = await pool.query(
      `INSERT INTO bonuses (employee_id, bonus_year, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, bonus_year) DO UPDATE SET amount = EXCLUDED.amount
       RETURNING bonus_id, employee_id, bonus_year, amount`,
      [body.employee_id, body.bonus_year, body.amount]
    );
    res.json(rows[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      res.status(400).json({ error: 'Employee does not exist' });
      return;
    }
    console.error('PUT /api/payroll/bonus:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to save bonus' });
  }
});

export default router;
