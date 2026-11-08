import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400 } from '../validation';
import {
  listPositions,
  createPosition,
  updatePosition,
  deletePosition,
  listApplicants,
  createApplicant,
  setApplicantStatus,
} from '../services/recruitment';
import { handleRouteError, parseIdParam } from './respond';

const router = express.Router();

const POSITION_STATUSES = ['open', 'closed'] as const;
const APPLICANT_STATUSES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;

const positiveId = (message: string) =>
  z.preprocess(
    (v) => Number(v),
    z.number().int().positive(message)
  );

const positionSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(150),
  department_id: positiveId('A valid department is required'),
  description: z.string().trim().max(5000).nullish(),
  headcount: z.preprocess(Number, z.number().int('Headcount must be 1-50').min(1, 'Headcount must be 1-50').max(50, 'Headcount must be 1-50')).default(1),
  status: z.enum(POSITION_STATUSES, { message: 'Status must be open or closed' }).default('open'),
});

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

// GET /api/recruitment/positions
router.get('/positions', requireAuth, requireRole('hr', 'executive'), async (_req: Request, res: Response) => {
  try {
    res.json(await listPositions());
  } catch (err) {
    handleRouteError(res, err, 'GET /api/recruitment/positions', 'Failed to fetch positions');
  }
});

// POST /api/recruitment/positions (HR / Executive)
router.post('/positions', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(positionSchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await createPosition(body));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/recruitment/positions', 'Failed to create position');
  }
});

// PUT /api/recruitment/positions/:id (HR / Executive)
router.put('/positions/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid position id' });
    return;
  }
  const body = parseOr400(positionSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await updatePosition(id, body));
  } catch (err) {
    handleRouteError(res, err, `PUT /api/recruitment/positions/${id}`, 'Failed to update position');
  }
});

// DELETE /api/recruitment/positions/:id (HR / Executive) - blocked while applicants exist
router.delete('/positions/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid position id' });
    return;
  }
  try {
    await deletePosition(id);
    res.json({ deleted: true });
  } catch (err) {
    handleRouteError(res, err, `DELETE /api/recruitment/positions/${id}`, 'Failed to delete position');
  }
});

// GET /api/recruitment/applicants?position_id=
router.get('/applicants', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const positionId = parseIdParam(String(req.query.position_id ?? ''));
  try {
    res.json(await listApplicants(positionId));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/recruitment/applicants', 'Failed to fetch applicants');
  }
});

// POST /api/recruitment/applicants (HR / Executive)
router.post('/applicants', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(applicantSchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await createApplicant(body));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/recruitment/applicants', 'Failed to create applicant');
  }
});

// PATCH /api/recruitment/applicants/:id/status (HR / Executive)
router.patch('/applicants/:id/status', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid applicant id' });
    return;
  }
  const body = parseOr400(applicantStatusSchema, req.body, res);
  if (!body) return;
  try {
    res.json(await setApplicantStatus(id, body.status));
  } catch (err) {
    handleRouteError(res, err, `PATCH /api/recruitment/applicants/${id}/status`, 'Failed to update applicant status');
  }
});

export default router;
