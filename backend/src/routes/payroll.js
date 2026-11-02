const express = require('express');
const { pool } = require('../db');
const { computeMonthlyPayroll } = require('../payroll');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const PAYROLL_SELECT = `
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
  WHERE p.pay_period_year = $1 AND p.pay_period_month = $2
  ORDER BY e.employee_id
`;

// GET /api/payroll?year=2026&month=9 - payslips for a month
router.get('/', requireAuth, async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'year and month are required' });
  }
  try {
    const { rows } = await pool.query(PAYROLL_SELECT, [year, month]);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/payroll:', err.message);
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

// POST /api/payroll/generate { year, month }
// Computes payslips for all active employees from attendance OT + bonus,
// then upserts payroll_records.
router.post('/generate', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const year = Number(req.body?.year);
  const month = Number(req.body?.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'Invalid year' });
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: 'Invalid month' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: employees } = await client.query(
      "SELECT employee_id, salary FROM employees WHERE status = 'active' ORDER BY employee_id"
    );

    for (const e of employees) {
      const { rows: otRows } = await client.query(
        `SELECT COALESCE(SUM(ot_hours), 0) AS ot FROM attendance
         WHERE employee_id = $1
           AND work_date >= make_date($2, $3, 1)
           AND work_date <  make_date($2, $3, 1) + INTERVAL '1 month'`,
        [e.employee_id, year, month]
      );
      const otHours = Number(otRows[0].ot) || 0;

      const { rows: bonusRows } = await client.query(
        'SELECT amount FROM bonuses WHERE employee_id = $1 AND bonus_year = $2',
        [e.employee_id, year]
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
        [e.employee_id, year, month, e.salary, otHours, otPay, annualBonus, sso, tax, netPay]
      );
    }

    await client.query('COMMIT');
    const { rows } = await client.query(PAYROLL_SELECT, [year, month]);
    res.status(201).json(rows);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/payroll/generate:', err.message);
    res.status(500).json({ error: 'Failed to generate payroll' });
  } finally {
    client.release();
  }
});

// PUT /api/payroll/bonus { employee_id, bonus_year, amount } - upsert annual bonus
router.put('/bonus', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const b = req.body || {};
  const employeeId = Number(b.employee_id);
  const bonusYear = Number(b.bonus_year);
  const amount = Number(b.amount);
  if (!Number.isInteger(employeeId)) return res.status(400).json({ error: 'A valid employee is required' });
  if (!Number.isInteger(bonusYear) || bonusYear < 2000 || bonusYear > 2100) {
    return res.status(400).json({ error: 'Invalid bonus year' });
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'Amount must be a non-negative number' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO bonuses (employee_id, bonus_year, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, bonus_year) DO UPDATE SET amount = EXCLUDED.amount
       RETURNING bonus_id, employee_id, bonus_year, amount`,
      [employeeId, bonusYear, amount]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Employee does not exist' });
    console.error('PUT /api/payroll/bonus:', err.message);
    res.status(500).json({ error: 'Failed to save bonus' });
  }
});

module.exports = router;
