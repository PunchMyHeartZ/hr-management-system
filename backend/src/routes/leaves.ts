// ============================================================
// /api/leaves — รายการใบลา / ยื่นใบลา / อนุมัติหรือปฏิเสธ
// สิทธิ์: พนักงานยื่นใบลาให้ตัวเองได้ (เฉพาะตัวเอง), อนุมัติเป็นสิทธิ์ HR/ผู้บริหาร
// ============================================================
import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400, numericIdSchema, dateStringSchema } from '../validation';
import { listLeaves, createLeave, setLeaveStatus } from '../services/leaves';
import { handleRouteError, parseIdParam } from './respond';

const router = express.Router();

const createLeaveSchema = z
  .object({
    employee_id: numericIdSchema('A valid employee is required'),
    leave_type: z.enum(['annual', 'sick', 'personal', 'unpaid'], { message: 'Invalid leave type' }),
    start_date: dateStringSchema,
    end_date: dateStringSchema,
    reason: z.string().trim().optional().transform((v) => v || null),
  })
  .refine((v) => new Date(v.end_date) >= new Date(v.start_date), {
    message: 'end_date must be on or after start_date',
    path: ['end_date'],
  });

const statusSchema = z.object({
  status: z.enum(['approved', 'rejected'], { message: "status must be 'approved' or 'rejected'" }),
});

// GET /api/leaves?employee_id= - leave requests (employees see only their own)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const scope = req.user?.role === 'employee' ? (req.user.employeeId ?? null) : Number(req.query.employee_id) || null;
  try {
    res.json(await listLeaves(scope));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/leaves', 'Failed to fetch leave requests');
  }
});

// POST /api/leaves - submit a new leave request (employees can only request for themselves)
router.post('/', requireAuth, requireRole('hr', 'executive', 'employee'), async (req: Request, res: Response) => {
  const body = parseOr400(createLeaveSchema, req.body, res);
  if (!body) return;
  if (req.user?.role === 'employee' && body.employee_id !== req.user.employeeId) {
    res.status(403).json({ error: 'You can only request leave for yourself' });
    return;
  }
  try {
    res.status(201).json(await createLeave(body));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/leaves', 'Failed to create leave request');
  }
});

// PATCH /api/leaves/:id/status - approve or reject
router.patch('/:id/status', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid leave id' });
    return;
  }
  const body = parseOr400(statusSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await setLeaveStatus(id, body.status));
  } catch (err) {
    handleRouteError(res, err, `PATCH /api/leaves/${id}/status`, 'Failed to update leave status');
  }
});

export default router;
