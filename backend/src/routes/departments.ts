// ============================================================
// /api/departments — CRUD แผนก (ใช้กับ dropdown และหน้าจัดการแผนก)
// สิทธิ์: ดู — ทุกคนที่ล็อกอิน, แก้ไข — HR และผู้บริหาร
// ============================================================
import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400 } from '../validation';
import { listDepartments, createDepartment, updateDepartment, deleteDepartment } from '../services/departments';
import { handleRouteError, parseIdParam } from './respond';

const router = express.Router();

const departmentBodySchema = z.object({
  department_name: z.string().trim().min(1, 'Department name is required').max(100),
  department_code: z.string().trim().min(1, 'Department code is required').max(10).toUpperCase(),
});

// GET /api/departments - list all departments (for dropdowns)
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    res.json(await listDepartments());
  } catch (err) {
    handleRouteError(res, err, 'GET /api/departments', 'Failed to fetch departments');
  }
});

// POST /api/departments - create (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(departmentBodySchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await createDepartment(body));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/departments', 'Failed to create department');
  }
});

// PUT /api/departments/:id - rename (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid department id' });
    return;
  }
  const body = parseOr400(departmentBodySchema, req.body, res);
  if (!body) return;
  try {
    res.json(await updateDepartment(id, body));
  } catch (err) {
    handleRouteError(res, err, `PUT /api/departments/${id}`, 'Failed to update department');
  }
});

// DELETE /api/departments/:id (HR / Executive) - blocked while employees exist
router.delete('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid department id' });
    return;
  }
  try {
    await deleteDepartment(id);
    res.json({ deleted: true });
  } catch (err) {
    handleRouteError(res, err, `DELETE /api/departments/${id}`, 'Failed to delete department');
  }
});

export default router;
