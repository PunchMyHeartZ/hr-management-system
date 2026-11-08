import express from 'express';
import type { Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getDashboardStats, getExecutiveStats } from '../services/stats';
import { handleRouteError } from './respond';

const router = express.Router();

// GET /api/stats/dashboard - KPIs + chart data (leaves & payroll)
router.get('/dashboard', requireAuth, async (_req: Request, res: Response) => {
  try {
    res.json(await getDashboardStats());
  } catch (err) {
    handleRouteError(res, err, 'GET /api/stats/dashboard', 'Failed to fetch dashboard data');
  }
});

// GET /api/stats/executive - confidential workforce cost insights (Executive only)
router.get('/executive', requireAuth, requireRole('executive'), async (_req: Request, res: Response) => {
  try {
    res.json(await getExecutiveStats());
  } catch (err) {
    handleRouteError(res, err, 'GET /api/stats/executive', 'Failed to fetch executive report');
  }
});

export default router;
