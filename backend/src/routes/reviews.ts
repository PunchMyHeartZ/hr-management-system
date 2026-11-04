import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, requireRole, canAccessEmployee } from '../middleware/auth';
import { parseOr400, positiveIdSchema } from '../validation';

const router = express.Router();

interface ReviewRow {
  review_id: number;
  employee_id: number;
  employee_name: string;
  department_name: string;
  period_year: number;
  reviewer_name: string;
  overall_score: string | null;
  strengths: string | null;
  improvements: string | null;
  status: string;
}

interface GoalRow {
  goal_id: number;
  review_id: number;
  title: string;
  weight: number;
  score: string | null;
}

const goalSchema = z.object({
  title: z.string().trim().min(1, 'Goal title is required').max(255),
  weight: z.preprocess(Number, z.number().int('Weight must be 1-5').min(1, 'Weight must be 1-5').max(5, 'Weight must be 1-5')),
  score: z
    .union([z.preprocess(Number, z.number().min(1, 'Score must be 1-5').max(5, 'Score must be 1-5')), z.null()])
    .optional(),
});

const reviewBodySchema = z.object({
  employee_id: positiveIdSchema('A valid employee is required'),
  period_year: z.preprocess(Number, z.number().int('Invalid year').min(2000, 'Invalid year').max(2100, 'Invalid year')),
  reviewer_name: z.string().trim().min(1, 'Reviewer name is required').max(150),
  overall_score: z.preprocess(Number, z.number().min(1, 'Score must be 1-5').max(5, 'Score must be 1-5')).nullish(),
  strengths: z.string().trim().max(5000).nullish(),
  improvements: z.string().trim().max(5000).nullish(),
  status: z.enum(['draft', 'final'], { message: 'Status must be draft or final' }).default('draft'),
  goals: z.array(goalSchema).max(10, 'A review can have at most 10 goals').default([]),
});

const SELECT_REVIEWS = `
  SELECT  r.review_id,
          r.employee_id,
          e.first_name || ' ' || e.last_name AS employee_name,
          d.department_name,
          r.period_year,
          r.reviewer_name,
          r.overall_score,
          r.strengths,
          r.improvements,
          r.status
  FROM reviews r
  JOIN employees e ON e.employee_id = r.employee_id
  JOIN departments d ON d.department_id = e.department_id
`;

async function loadReview(reviewId: number): Promise<ReviewRow | null> {
  const { rows } = await pool.query<ReviewRow>(`${SELECT_REVIEWS} WHERE r.review_id = $1`, [reviewId]);
  return rows[0] ?? null;
}

async function replaceGoals(reviewId: number, goals: z.infer<typeof goalSchema>[]): Promise<void> {
  await pool.query('DELETE FROM review_goals WHERE review_id = $1', [reviewId]);
  for (const g of goals) {
    await pool.query(
      'INSERT INTO review_goals (review_id, title, weight, score) VALUES ($1, $2, $3, $4)',
      [reviewId, g.title, g.weight, g.score ?? null]
    );
  }
}

// GET /api/reviews?employee_id=&year= - list reviews (employees see only their own)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const filters: string[] = [];
  const params: unknown[] = [];
  if (user.role === 'employee') {
    params.push(user.employeeId ?? -1);
    filters.push(`r.employee_id = $${params.length}`);
  } else if (Number(req.query.employee_id) > 0) {
    params.push(Number(req.query.employee_id));
    filters.push(`r.employee_id = $${params.length}`);
  }
  const year = Number(req.query.year);
  if (Number.isInteger(year) && year > 2000) {
    params.push(year);
    filters.push(`r.period_year = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query<ReviewRow>(
      `${SELECT_REVIEWS} ${where} ORDER BY r.period_year DESC, e.employee_id`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/reviews:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /api/reviews/:id - review with goals
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid review id' });
    return;
  }
  try {
    const review = await loadReview(id);
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    if (!canAccessEmployee(req.user, review.employee_id)) {
      res.status(403).json({ error: 'You can only view your own reviews' });
      return;
    }
    const { rows: goals } = await pool.query<GoalRow>(
      'SELECT goal_id, review_id, title, weight, score FROM review_goals WHERE review_id = $1 ORDER BY goal_id',
      [id]
    );
    res.json({ ...review, goals });
  } catch (err) {
    console.error(`GET /api/reviews/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// POST /api/reviews - create (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(reviewBodySchema, req.body, res);
  if (!body) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ review_id: number }>(
      `INSERT INTO reviews (employee_id, period_year, reviewer_name, overall_score, strengths, improvements, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING review_id`,
      [body.employee_id, body.period_year, body.reviewer_name, body.overall_score ?? null, body.strengths ?? null, body.improvements ?? null, body.status]
    );
    const reviewId = rows[0].review_id;
    for (const g of body.goals) {
      await client.query(
        'INSERT INTO review_goals (review_id, title, weight, score) VALUES ($1, $2, $3, $4)',
        [reviewId, g.title, g.weight, g.score ?? null]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(await loadReview(reviewId));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (pgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'A review already exists for this employee and year' });
      return;
    }
    if (pgErrorCode(err) === '23503') {
      res.status(400).json({ error: 'Selected employee does not exist' });
      return;
    }
    console.error('POST /api/reviews:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create review' });
  } finally {
    client.release();
  }
});

// PUT /api/reviews/:id - update with goal replacement (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid review id' });
    return;
  }
  const updateSchema = reviewBodySchema.omit({ employee_id: true });
  const body = parseOr400(updateSchema, req.body, res);
  if (!body) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE reviews SET period_year = $1, reviewer_name = $2, overall_score = $3,
              strengths = $4, improvements = $5, status = $6
       WHERE review_id = $7`,
      [body.period_year, body.reviewer_name, body.overall_score ?? null, body.strengths ?? null, body.improvements ?? null, body.status, id]
    );
    if (rowCount === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    await replaceGoals(id, body.goals);
    await client.query('COMMIT');
    res.json(await loadReview(id));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (pgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'A review already exists for this employee and year' });
      return;
    }
    console.error(`PUT /api/reviews/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to update review' });
  } finally {
    client.release();
  }
});

// DELETE /api/reviews/:id (HR / Executive)
router.delete('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid review id' });
    return;
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM reviews WHERE review_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(`DELETE /api/reviews/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;
