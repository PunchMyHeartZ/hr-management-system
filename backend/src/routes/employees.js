const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SELECT_WITH_DEPARTMENT = `
  SELECT  e.employee_id,
          e.first_name,
          e.last_name,
          e.email,
          e.phone,
          e.position,
          e.department_id,
          d.department_name,
          to_char(e.hire_date, 'YYYY-MM-DD') AS hire_date,
          e.salary,
          e.status,
          e.annual_leave_quota,
          COALESCE((SELECT SUM(lr.end_date - lr.start_date + 1)
                    FROM leave_requests lr
                    WHERE lr.employee_id = e.employee_id
                      AND lr.leave_type = 'annual'
                      AND lr.status = 'approved'
                      AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS used_leave_days
  FROM employees e
  JOIN departments d ON d.department_id = e.department_id
`;

// GET /api/employees - all employees with department name (JOIN)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`${SELECT_WITH_DEPARTMENT} ORDER BY e.employee_id`);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/employees:', err.message);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id - single employee
router.get('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid employee id' });
  }
  try {
    const { rows } = await pool.query(`${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/employees/${id}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/employees - create a new employee (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const b = req.body || {};
  const firstName = String(b.first_name ?? '').trim();
  const lastName = String(b.last_name ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim() || null;
  const position = String(b.position ?? '').trim();
  const departmentId = Number(b.department_id);
  const hireDate = String(b.hire_date ?? '').trim() || null;
  const salary = Number(b.salary);
  const leaveQuota = b.annual_leave_quota == null || b.annual_leave_quota === '' ? 10 : Number(b.annual_leave_quota);

  if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (!position) return res.status(400).json({ error: 'Position is required' });
  if (!Number.isInteger(departmentId)) return res.status(400).json({ error: 'A valid department is required' });
  if (!Number.isFinite(salary) || salary < 0) return res.status(400).json({ error: 'Salary must be a non-negative number' });
  if (!Number.isInteger(leaveQuota) || leaveQuota < 0 || leaveQuota > 365) {
    return res.status(400).json({ error: 'Annual leave quota must be 0-365 days' });
  }
  if (hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) return res.status(400).json({ error: 'hire_date must be in YYYY-MM-DD format' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (first_name, last_name, email, phone, position, department_id, hire_date, salary, annual_leave_quota)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9)
       RETURNING employee_id, first_name, last_name, email, phone, position, department_id, hire_date, salary, annual_leave_quota, status`,
      [firstName, lastName, email, phone, position, departmentId, hireDate, salary, leaveQuota]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An employee with this email already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'Selected department does not exist' });
    console.error('POST /api/employees:', err.message);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - update an employee (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid employee id' });

  const b = req.body || {};
  const firstName = String(b.first_name ?? '').trim();
  const lastName = String(b.last_name ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const phone = String(b.phone ?? '').trim() || null;
  const position = String(b.position ?? '').trim();
  const departmentId = Number(b.department_id);
  const hireDate = String(b.hire_date ?? '').trim() || null;
  const salary = Number(b.salary);
  const status = String(b.status ?? '').trim();
  const leaveQuota = b.annual_leave_quota == null || b.annual_leave_quota === '' ? 10 : Number(b.annual_leave_quota);

  if (!firstName || !lastName) return res.status(400).json({ error: 'First name and last name are required' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (!position) return res.status(400).json({ error: 'Position is required' });
  if (!Number.isInteger(departmentId)) return res.status(400).json({ error: 'A valid department is required' });
  if (!Number.isFinite(salary) || salary < 0) return res.status(400).json({ error: 'Salary must be a non-negative number' });
  if (!['active', 'inactive', 'terminated'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (!Number.isInteger(leaveQuota) || leaveQuota < 0 || leaveQuota > 365) {
    return res.status(400).json({ error: 'Annual leave quota must be 0-365 days' });
  }
  if (hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) return res.status(400).json({ error: 'hire_date must be in YYYY-MM-DD format' });

  try {
    const { rowCount } = await pool.query(
      `UPDATE employees SET first_name = $1, last_name = $2, email = $3, phone = $4,
              position = $5, department_id = $6, hire_date = COALESCE($7::date, hire_date),
              salary = $8, status = $9, annual_leave_quota = $10
       WHERE employee_id = $11`,
      [firstName, lastName, email, phone, position, departmentId, hireDate, salary, status, leaveQuota, id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Employee not found' });
    const { rows } = await pool.query(`${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'An employee with this email already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'Selected department does not exist' });
    console.error(`PUT /api/employees/${id}:`, err.message);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

module.exports = router;
