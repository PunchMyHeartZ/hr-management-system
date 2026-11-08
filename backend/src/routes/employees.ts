import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole, canAccessEmployee } from '../middleware/auth';
import { parseOr400, emailSchema, positiveIdSchema } from '../validation';
import { listEmployees, findEmployee, createEmployee, updateEmployee, createEmployeeAccount } from '../services/employees';
import { handleRouteError, parseIdParam } from './respond';

const router = express.Router();

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
  const scope = req.user?.role === 'employee' ? (req.user.employeeId ?? -1) : null;
  try {
    res.json(await listEmployees(scope));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/employees', 'Failed to fetch employees');
  }
});

// GET /api/employees/:id - single employee (employees may only read their own)
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid employee id' });
    return;
  }
  if (!canAccessEmployee(req.user, id)) {
    res.status(403).json({ error: 'You can only view your own profile' });
    return;
  }
  try {
    res.json(await findEmployee(id));
  } catch (err) {
    handleRouteError(res, err, `GET /api/employees/${id}`, 'Failed to fetch employee');
  }
});

// POST /api/employees - create a new employee (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(employeeCreateSchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await createEmployee(body));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/employees', 'Failed to create employee');
  }
});

// PUT /api/employees/:id - update an employee (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid employee id' });
    return;
  }
  const body = parseOr400(employeeUpdateSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await updateEmployee(id, body));
  } catch (err) {
    handleRouteError(res, err, `PUT /api/employees/${id}`, 'Failed to update employee');
  }
});

// POST /api/employees/:id/account - create a self-service login for an employee (HR / Executive)
router.post('/:id/account', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
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
    res.status(201).json(await createEmployeeAccount(id, body));
  } catch (err) {
    handleRouteError(res, err, `POST /api/employees/${id}/account`, 'Failed to create account');
  }
});

export default router;
