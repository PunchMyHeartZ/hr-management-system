import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400 } from '../validation';

const router = express.Router();

const POSITION_STATUSES = ['open', 'closed'] as const;
const APPLICANT_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;

interface PositionRow {
  position_id: number;
  title: string;
  department_id: number | null;
  department_name: string | null;
  description: string | null;
  headcount: number;
  status: string;
  applicant_count: string;
}

interface ApplicantRow {
  applicant_id: number;
  position_id: number;
  position_title: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  applied_at: Date;
}

const positionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  department_id: positiveId('A valid department is required'),
  description: z.string().trim().max(5000).nullish(),
  headcount: z.preprocess(Number, z.number().int('Headcount must be 1-50').min(1, 'Headcount must be 1-50').max(50, 'Headcount must be 1-50')).default(1),
  status: z.enum(POSITION_STATUSES, { message: 'Status must be open or closed' }).default('open'),
});

function positiveId(message: string) {
  return z.preprocess(
    (v) => Number(v),
    z.number().int().positive(message)
  );
}

const applicantSchema = z.object({
  position_id: positiveId('A valid position is required'),
  full_name: z.string().trim().min(1, 'Full name is required').max(150),
  email: z.email('A valid email is required'),
  phone: z.string().trim().max(20).nullish(),
  notes: z.string().trim().max(5000).nullish(),
});

const applicantStatusSchema = z.object({
  status: z.enum(APPLICANT_STATUSES, { message: 'Invalid applicant status' }),
});

const SELECT_POSITIONS = `
  SELECT  p.position_id, p.title, p.department_id, d.department_name,
          p.description, p.headcount, p.status,
          (SELECT count(*) FROM applicants a WHERE a.position_id = p.position_id) AS applicant_count
  FROM positions p
  LEFT JOIN departments d ON d.department_id = p.department_id
`;

// GET /api/recruitment/positions
router.get('/positions', requireAuth, requireRole('hr', 'executive'), async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<PositionRow>(`${SELECT_POSITIONS} ORDER BY p.status = 'open' DESC, p.created_at DESC`);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/recruitment/positions:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

// POST /api/recruitment/positions (HR / Executive)
router.post('/positions', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(positionSchema, req.body, res);
  if (!body) return;
  try {
    const { rows } = await pool.query(
      `INSERT INTO positions (title, department_id, description, headcount, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING position_id`,
      [body.title, body.department_id, body.description ?? null, body.headcount, body.status]
    );
    const { rows: full } = await pool.query<PositionRow>(`${SELECT_POSITIONS} WHERE p.position_id = $1`, [rows[0].position_id]);
    res.status(201).json(full[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      res.status(400).json({ error: 'Selected department does not exist' });
      return;
    }
    console.error('POST /api/recruitment/positions:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create position' });
  }
});

// PUT /api/recruitment/positions/:id (HR / Executive)
router.put('/positions/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid position id' });
    return;
  }
  const body = parseOr400(positionSchema, req.body, res);
  if (!body) return;
  try {
    const { rowCount } = await pool.query(
      `UPDATE positions SET title = $1, department_id = $2, description = $3, headcount = $4, status = $5
       WHERE position_id = $6`,
      [body.title, body.department_id, body.description ?? null, body.headcount, body.status, id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }
    const { rows } = await pool.query<PositionRow>(`${SELECT_POSITIONS} WHERE p.position_id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(`PUT /api/recruitment/positions/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to update position' });
  }
});

// DELETE /api/recruitment/positions/:id (HR / Executive) - blocked while applicants exist
router.delete('/positions/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid position id' });
    return;
  }
  try {
    const { rows: used } = await pool.query<{ count: string }>(
      'SELECT count(*) AS count FROM applicants WHERE position_id = $1',
      [id]
    );
    if (Number(used[0].count) > 0) {
      res.status(409).json({ error: 'Cannot delete a position that has applicants' });
      return;
    }
    const { rowCount } = await pool.query('DELETE FROM positions WHERE position_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Position not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(`DELETE /api/recruitment/positions/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to delete position' });
  }
});

// GET /api/recruitment/applicants?position_id=
router.get('/applicants', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const positionId = Number(req.query.position_id);
  const scope = Number.isInteger(positionId) && positionId > 0 ? positionId : null;
  try {
    const { rows } = await pool.query<ApplicantRow>(
      `SELECT a.applicant_id, a.position_id, p.title AS position_title, a.full_name, a.email,
              a.phone, a.status, a.notes, a.applied_at
       FROM applicants a
       JOIN positions p ON p.position_id = a.position_id
       ${scope ? 'WHERE a.position_id = $1' : ''}
       ORDER BY a.applied_at DESC`,
      scope ? [scope] : []
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/recruitment/applicants:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// POST /api/recruitment/applicants (HR / Executive)
router.post('/applicants', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(applicantSchema, req.body, res);
  if (!body) return;
  try {
    const { rows } = await pool.query(
      `INSERT INTO applicants (position_id, full_name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING applicant_id`,
      [body.position_id, body.full_name, body.email, body.phone ?? null, body.notes ?? null]
    );
    const { rows: full } = await pool.query<ApplicantRow>(
      `SELECT a.applicant_id, a.position_id, p.title AS position_title, a.full_name, a.email,
              a.phone, a.status, a.notes, a.applied_at
       FROM applicants a JOIN positions p ON p.position_id = a.position_id
       WHERE a.applicant_id = $1`,
      [rows[0].applicant_id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      res.status(400).json({ error: 'Selected position does not exist' });
      return;
    }
    console.error('POST /api/recruitment/applicants:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create applicant' });
  }
});

// PATCH /api/recruitment/applicants/:id/status (HR / Executive)
router.patch('/applicants/:id/status', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid applicant id' });
    return;
  }
  const body = parseOr400(applicantStatusSchema, req.body, res);
  if (!body) return;
  try {
    const { rows } = await pool.query(
      'UPDATE applicants SET status = $1 WHERE applicant_id = $2 RETURNING applicant_id, status',
      [body.status, id]
    );
    if (rows.length === 0) {
      res.status(404).json({ error: 'Applicant not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/recruitment/applicants/${id}/status:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to update applicant status' });
  }
});

export default router;
