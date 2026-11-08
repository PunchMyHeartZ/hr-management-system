import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400, numericIdSchema } from '../validation';
import { listPayslips, generateMonthlyPayroll, upsertBonus } from '../services/payroll';
import { handleRouteError } from './respond';

const router = express.Router();

const yearSchema = z.preprocess(
  Number,
  z.number().int('Invalid year').min(2000, 'Invalid year').max(2100, 'Invalid year')
);

const monthSchema = z.preprocess(
  Number,
  z.number().int('Invalid month').min(1, 'Invalid month').max(12, 'Invalid month')
);

const periodQuerySchema = z.object({ year: yearSchema, month: monthSchema });

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
  const query = periodQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.issues[0]?.message ?? 'year and month are required' });
    return;
  }
  const scope = req.user?.role === 'employee' ? (req.user.employeeId ?? null) : Number(req.query.employee_id) || null;
  try {
    res.json(await listPayslips(query.data.year, query.data.month, scope));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/payroll', 'Failed to fetch payroll');
  }
});

// POST /api/payroll/generate { year, month } - compute and upsert payslips for all active employees
router.post('/generate', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(generateSchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await generateMonthlyPayroll(body.year, body.month));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/payroll/generate', 'Failed to generate payroll');
  }
});

// PUT /api/payroll/bonus { employee_id, bonus_year, amount } - upsert annual bonus
router.put('/bonus', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(bonusSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await upsertBonus(body));
  } catch (err) {
    handleRouteError(res, err, 'PUT /api/payroll/bonus', 'Failed to save bonus');
  }
});

export default router;
