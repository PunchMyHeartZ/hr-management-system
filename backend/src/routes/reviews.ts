import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole, canAccessEmployee } from '../middleware/auth';
import { parseOr400, positiveIdSchema } from '../validation';
import {
  listReviews,
  findReview,
  findReviewGoals,
  createReview,
  updateReview,
  deleteReview,
} from '../services/reviews';
import { handleRouteError, parseIdParam } from './respond';

const router = express.Router();

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

const reviewUpdateSchema = reviewBodySchema.omit({ employee_id: true });

// GET /api/reviews?employee_id=&year= - list reviews (employees see only their own)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const employeeId =
    user.role === 'employee'
      ? (user.employeeId ?? -1)
      : Number(req.query.employee_id) > 0
        ? Number(req.query.employee_id)
        : null;
  const year = Number(req.query.year);
  const yearFilter = Number.isInteger(year) && year > 2000 ? year : null;
  try {
    res.json(await listReviews({ employeeId, year: yearFilter }));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/reviews', 'Failed to fetch reviews');
  }
});

// GET /api/reviews/:id - review with goals
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid review id' });
    return;
  }
  try {
    const review = await findReview(id);
    if (!canAccessEmployee(req.user, review.employee_id)) {
      res.status(403).json({ error: 'You can only view your own reviews' });
      return;
    }
    const goals = await findReviewGoals(id);
    res.json({ ...review, goals });
  } catch (err) {
    handleRouteError(res, err, `GET /api/reviews/${id}`, 'Failed to fetch review');
  }
});

// POST /api/reviews - create (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(reviewBodySchema, req.body, res);
  if (!body) return;
  const { employee_id, ...write } = body;
  try {
    res.status(201).json(await createReview(employee_id, write));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/reviews', 'Failed to create review');
  }
});

// PUT /api/reviews/:id - update with goal replacement (HR / Executive)
router.put('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid review id' });
    return;
  }
  const body = parseOr400(reviewUpdateSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await updateReview(id, body));
  } catch (err) {
    handleRouteError(res, err, `PUT /api/reviews/${id}`, 'Failed to update review');
  }
});

// DELETE /api/reviews/:id (HR / Executive)
router.delete('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid review id' });
    return;
  }
  try {
    await deleteReview(id);
    res.json({ deleted: true });
  } catch (err) {
    handleRouteError(res, err, `DELETE /api/reviews/${id}`, 'Failed to delete review');
  }
});

export default router;
