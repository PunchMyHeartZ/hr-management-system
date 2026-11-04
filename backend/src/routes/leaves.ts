import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, requireRole, canAccessEmployee } from '../middleware/auth';
import { parseOr400, numericIdSchema, dateStringSchema } from '../validation';

const router = express.Router();

interface LeaveRow {
  leave_id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string;
}

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
  const scope = req.user?.role === 'employee' ? req.user.employeeId : Number(req.query.employee_id) || null;
  try {
    const { rows } = await pool.query<LeaveRow>(`
      SELECT  l.leave_id,
              l.employee_id,
              e.first_name || ' ' || e.last_name AS employee_name,
              l.leave_type,
              to_char(l.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(l.end_date,   'YYYY-MM-DD') AS end_date,
              (l.end_date - l.start_date + 1)     AS total_days,
              l.reason,
              l.status
      FROM leave_requests l
      JOIN employees e ON e.employee_id = l.employee_id
      ${scope ? 'WHERE l.employee_id = $1' : ''}
      ORDER BY l.leave_id DESC
    `, scope ? [scope] : []);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/leaves:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
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
    const { rows } = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING leave_id, employee_id, leave_type, start_date, end_date, reason, status`,
      [body.employee_id, body.leave_type, body.start_date, body.end_date, body.reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      res.status(400).json({ error: 'Selected employee does not exist' });
      return;
    }
    console.error('POST /api/leaves:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PATCH /api/leaves/:id/status - approve or reject
router.patch('/:id/status', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid leave id' });
    return;
  }
  const body = parseOr400(statusSchema, req.body, res);
  if (!body) return;

  try {
    const { rows } = await pool.query(
      'UPDATE leave_requests SET status = $1 WHERE leave_id = $2 RETURNING leave_id, status',
      [body.status, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/leaves/${id}/status:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

export default router;
