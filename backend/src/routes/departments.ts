import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400 } from '../validation';

const router = express.Router();

interface DepartmentRow {
  department_id: number;
  department_name: string;
  department_code: string;
}

const departmentBodySchema = z.object({
  department_name: z.string().trim().min(1, 'Department name is required').max(100),
  department_code: z.string().trim().min(1, 'Department code is required').max(10).toUpperCase(),
});

// GET /api/departments - list all departments (for dropdowns)
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<DepartmentRow>(
      'SELECT department_id, department_name, department_code FROM departments ORDER BY department_name'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/departments:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// POST /api/departments - create (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(departmentBodySchema, req.body, res);
  if (!body) return;
  try {
    const { rows } = await pool.query<DepartmentRow>(
      `INSERT INTO departments (department_name, department_code)
       VALUES ($1, $2)
       RETURNING department_id, department_name, department_code`,
      [body.department_name, body.department_code]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'Department name or code already exists' });
      return;
    }
    console.error('POST /api/departments:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// PUT /api/departments/:id - rename (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid department id' });
    return;
  }
  const body = parseOr400(departmentBodySchema, req.body, res);
  if (!body) return;
  try {
    const { rows } = await pool.query<DepartmentRow>(
      `UPDATE departments SET department_name = $1, department_code = $2
       WHERE department_id = $3
       RETURNING department_id, department_name, department_code`,
      [body.department_name, body.department_code, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'Department name or code already exists' });
      return;
    }
    console.error(`PUT /api/departments/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// DELETE /api/departments/:id (HR / Executive) - blocked while employees exist
router.delete('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid department id' });
    return;
  }
  try {
    const { rows: used } = await pool.query<{ count: string }>(
      'SELECT count(*) AS count FROM employees WHERE department_id = $1',
      [id]
    );
    if (Number(used[0].count) > 0) {
      res.status(409).json({ error: 'Cannot delete a department that still has employees' });
      return;
    }
    const { rowCount } = await pool.query('DELETE FROM departments WHERE department_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Department not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(`DELETE /api/departments/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

export default router;
