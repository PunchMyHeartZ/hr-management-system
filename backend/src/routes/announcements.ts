import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { parseOr400 } from '../validation';

const router = express.Router();

interface AnnouncementRow {
  announcement_id: number;
  title: string;
  body: string;
  author_name: string | null;
  created_at: Date;
}

const announcementSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().trim().min(1, 'Body is required'),
});

const SELECT_ANNOUNCEMENTS = `
  SELECT a.announcement_id, a.title, a.body, u.full_name AS author_name, a.created_at
  FROM announcements a
  LEFT JOIN users u ON u.user_id = a.created_by
`;

// GET /api/announcements - latest first
router.get('/', requireAuth, async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<AnnouncementRow>(
      `${SELECT_ANNOUNCEMENTS} ORDER BY a.created_at DESC LIMIT 30`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/announcements:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements (HR / Executive)
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const body = parseOr400(announcementSchema, req.body, res);
  if (!body) return;
  try {
    const { rows } = await pool.query<AnnouncementRow>(
      `INSERT INTO announcements (title, body, created_by)
       VALUES ($1, $2, $3)
       RETURNING announcement_id`,
      [body.title, body.body, req.user!.id]
    );
    const { rows: full } = await pool.query<AnnouncementRow>(
      `${SELECT_ANNOUNCEMENTS} WHERE a.announcement_id = $1`,
      [rows[0].announcement_id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    console.error('POST /api/announcements:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// DELETE /api/announcements/:id (HR / Executive)
router.delete('/:id', requireAuth, requireRole('hr', 'executive'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid announcement id' });
    return;
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM announcements WHERE announcement_id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Announcement not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error(`DELETE /api/announcements/${id}:`, err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
