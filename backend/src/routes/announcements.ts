import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400 } from '../validation';
import { listAnnouncements, createAnnouncement, deleteAnnouncement } from '../services/announcements';
import { handleRouteError, parseIdParam } from './respond';

const router = express.Router();

const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().trim().min(1, 'Body is required'),
});

// GET /api/announcements - latest first
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    res.json(await listAnnouncements());
  } catch (err) {
    handleRouteError(res, err, 'GET /api/announcements', 'Failed to fetch announcements');
  }
});

// POST /api/announcements (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(announcementSchema, req.body, res);
  if (!body) return;
  try {
    res.status(201).json(await createAnnouncement(req.user!.id, body));
  } catch (err) {
    handleRouteError(res, err, 'POST /api/announcements', 'Failed to create announcement');
  }
});

// DELETE /api/announcements/:id (HR / Executive)
router.delete('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid announcement id' });
    return;
  }
  try {
    await deleteAnnouncement(id);
    res.json({ deleted: true });
  } catch (err) {
    handleRouteError(res, err, `DELETE /api/announcements/${id}`, 'Failed to delete announcement');
  }
});

export default router;
