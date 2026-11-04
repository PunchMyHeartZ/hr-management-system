import express from 'express';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400, numericIdSchema } from '../validation';
import { z } from 'zod';

const router = express.Router();

interface AttendanceRow {
  attendance_id: number;
  employee_id: number;
  employee_name: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: string | null;
  ot_hours: number;
}

const employeeIdSchema = z.object({ employee_id: numericIdSchema('A valid employee is required') });

const pad = (n: number) => String(n).padStart(2, '0');

// GET /api/attendance?employee_id= - recent records (employees see only their own)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const scope = req.user?.role === 'employee' ? req.user.employeeId : Number(req.query.employee_id) || null;
  try {
    const { rows } = await pool.query<AttendanceRow>(`
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
    res.json(rows);
  } catch (err) {
    console.error('GET /api/attendance:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance/check-in - clock in now
router.post('/check-in', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(employeeIdSchema, req.body, res);
  if (!body) return;

  const now = new Date();
  const workDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const checkIn = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance (employee_id, work_date, check_in)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, work_date) DO NOTHING
       RETURNING attendance_id, employee_id, work_date, check_in`,
      [body.employee_id, workDate, checkIn]
    );
    if (rows.length === 0) {
      res.status(409).json({ error: 'Already clocked in today' });
      return;
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      res.status(400).json({ error: 'Employee does not exist' });
      return;
    }
    console.error('POST /api/attendance/check-in:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// POST /api/attendance/check-out - clock out now, auto-compute OT hours
// OT = max(0, worked hours - 8), worked hours = (out - in) - 1h lunch break
router.post('/check-out', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(employeeIdSchema, req.body, res);
  if (!body) return;

  const now = new Date();
  const workDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const checkOut = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  try {
    const { rows: existing } = await pool.query<{ attendance_id: number; check_in: string; check_out: string | null }>(
      'SELECT attendance_id, check_in, check_out FROM attendance WHERE employee_id = $1 AND work_date = $2',
      [body.employee_id, workDate]
    );
    const record = existing[0];
    if (!record) {
      res.status(404).json({ error: 'No clock-in found for today' });
      return;
    }
    if (record.check_out !== null) {
      res.status(409).json({ error: 'Already clocked out today' });
      return;
    }
    const [h, m] = String(record.check_in).split(':').map(Number);
    const inMin = h * 60 + m;
    const outMin = now.getHours() * 60 + now.getMinutes();
    const workedHours = Math.max(0, (outMin - inMin) / 60 - 1);
    const otHours = Math.max(0, Math.round((workedHours - 8) * 100) / 100);

    const { rows } = await pool.query(
      'UPDATE attendance SET check_out = $1, ot_hours = $2 WHERE attendance_id = $3 RETURNING *',
      [checkOut, otHours, record.attendance_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/attendance/check-out:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

export default router;
