// ============================================================
// /api/attendance — ประวัติลงเวลา / ลงเวลาเข้า (check-in) / ลงเวลาออก (check-out)
// เวลา "ปัจจุบัน" ถูกสร้างที่นี่แล้วส่งให้ service (ทำให้ service ทดสอบได้ง่าย)
// สิทธิ์: ดู — ทุกคน (พนักงานเห็นของตัวเอง), ลงเวลา — HR/ผู้บริหาร
// ============================================================
import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400, numericIdSchema } from '../validation';
import { listAttendance, clockIn, clockOut } from '../services/attendance';
import { handleRouteError } from './respond';

const router = express.Router();

const employeeIdSchema = z.object({ employee_id: numericIdSchema('A valid employee is required') });

// GET /api/attendance?employee_id= - recent records (employees see only their own)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const scope = req.user?.role === 'employee' ? (req.user.employeeId ?? null) : Number(req.query.employee_id) || null;
  try {
    res.json(await listAttendance(scope));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/attendance', 'Failed to fetch attendance');
  }
});

// POST /api/attendance/check-in - clock in now
router.post('/check-in', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(employeeIdSchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await clockIn(body.employee_id, new Date()));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/attendance/check-in', 'Failed to clock in');
  }
});

// POST /api/attendance/check-out - clock out now, auto-compute OT hours
router.post('/check-out', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(employeeIdSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await clockOut(body.employee_id, new Date()));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/attendance/check-out', 'Failed to clock out');
  }
});

export default router;
