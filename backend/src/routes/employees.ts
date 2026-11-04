import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, requireRole, canAccessEmployee } from '../middleware/auth';
import { parseOr400, emailSchema, positiveIdSchema } from '../validation';

const router = express.Router();

interface EmployeeRow {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  department_id: number;
  department_name: string;
  hire_date: string;
  salary: string;
  status: string;
  annual_leave_quota: number;
  used_leave_days: string;
}

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

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

const optionalHireDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'hire_date must be in YYYY-MM-DD format'), z.literal('')])
  .optional()
  .transform((v) => v || null);

const leaveQuota = z.preprocess(
  (v) => (v == null || v === '' ? 10 : Number(v)),
  z.number().int('Annual leave quota must be 0-365 days').min(0, 'Annual leave quota must be 0-365 days').max(365, 'Annual leave quota must be 0-365 days')
);

const employeeBaseSchema = z.object({
  first_name: z.string().trim().min(1, 'First name and last name are required'),
  last_name: z.string().trim().min(1, 'First name and last name are required'),
  email: emailSchema,
  phone: optionalPhone,
  position: z.string().trim().min(1, 'Position is required'),
  department_id: positiveIdSchema('A valid department is required'),
  hire_date: optionalHireDate,
  salary: z.preprocess(
    Number,
    z.number().min(0, 'Salary must be a non-negative number')
  ),
  annual_leave_quota: leaveQuota,
});

const employeeCreateSchema = employeeBaseSchema;

const employeeUpdateSchema = employeeBaseSchema.extend({
  status: z.enum(['active', 'inactive', 'terminated'], { message: 'Invalid status' }),
});

// GET /api/employees - all employees with department name (employees see only their own record)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user?.role === 'employee') {
      const ownId = req.user.employeeId ?? -1;
      const { rows } = await pool.query<EmployeeRow>(
        `${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`,
        [ownId]
      );
      res.json(rows);
      return;
    }
    const { rows } = await pool.query<EmployeeRow>(`${SELECT_WITH_DEPARTMENT} ORDER BY e.employee_id`);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/employees:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id - single employee (employees may only read their own)
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid employee id' });
    return;
  }
  if (!canAccessEmployee(req.user, id)) {
    res.status(403).json({ error: 'You can only view your own profile' });
    return;
  }
  try {
    const { rows } = await pool.query<EmployeeRow>(`${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`, [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/employees/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

// POST /api/employees - create a new employee (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(employeeCreateSchema, req.body, res);
  if (!body) return;

  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (first_name, last_name, email, phone, position, department_id, hire_date, salary, annual_leave_quota)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9)
       RETURNING employee_id, first_name, last_name, email, phone, position, department_id, hire_date, salary, annual_leave_quota, status`,
      [body.first_name, body.last_name, body.email, body.phone, body.position, body.department_id, body.hire_date, body.salary, body.annual_leave_quota]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    const code = pgErrorCode(err);
    if (code === '23505') {
      res.status(409).json({ error: 'An employee with this email already exists' });
      return;
    }
    if (code === '23503') {
      res.status(400).json({ error: 'Selected department does not exist' });
      return;
    }
    console.error('POST /api/employees:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id - update an employee (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid employee id' });
    return;
  }

  const body = parseOr400(employeeUpdateSchema, req.body, res);
  if (!body) return;

  try {
    const { rowCount } = await pool.query(
      `UPDATE employees SET first_name = $1, last_name = $2, email = $3, phone = $4,
              position = $5, department_id = $6, hire_date = COALESCE($7::date, hire_date),
              salary = $8, status = $9, annual_leave_quota = $10
       WHERE employee_id = $11`,
      [body.first_name, body.last_name, body.email, body.phone, body.position, body.department_id, body.hire_date, body.salary, body.status, body.annual_leave_quota, id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    const { rows } = await pool.query<EmployeeRow>(`${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {
    const code = pgErrorCode(err);
    if (code === '23505') {
      res.status(409).json({ error: 'An employee with this email already exists' });
      return;
    }
    if (code === '23503') {
      res.status(400).json({ error: 'Selected department does not exist' });
      return;
    }
    console.error(`PUT /api/employees/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// POST /api/employees/:id/account - create a self-service login for an employee (HR / Executive)
router.post(
  '/:id/account',
  requireAuth,
  requireRole('hr', 'executive'),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid employee id' });
      return;
    }
    const accountSchema = z.object({
      username: z.string().trim().min(3, 'Username must be at least 3 characters').max(50),
      password: z.string().min(6, 'Password must be at least 6 characters'),
    });
    const body = parseOr400(accountSchema, req.body, res);
    if (!body) return;

    try {
      const { rows: empRows } = await pool.query(
        'SELECT first_name, last_name, email FROM employees WHERE employee_id = $1',
        [id]
      );
      const employee = empRows[0];
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      const { rows: existing } = await pool.query('SELECT user_id FROM users WHERE employee_id = $1', [id]);
      if (existing.length > 0) {
        res.status(409).json({ error: 'This employee already has a login' });
        return;
      }
      const hash = await bcrypt.hash(body.password, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (username, email, password_hash, full_name, role, employee_id)
         VALUES ($1, $2, $3, $4, 'employee', $5)
         RETURNING user_id, username, email, full_name, role, employee_id`,
        [body.username, `${body.username.toLowerCase()}@hrms.local`, hash, `${employee.first_name} ${employee.last_name}`, id]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (pgErrorCode(err) === '23505') {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
      console.error(`POST /api/employees/${id}/account:`, err instanceof Error ? err.message : err);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }
);

export default router;
