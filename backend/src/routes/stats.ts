// ============================================================
// /api/stats — ข้อมูลกราฟและตัวเลขสรุป
//   /dashboard  ทุกคนที่ล็อกอิน (KPI + กราฟหน้าแรก)
//   /executive  เฉพาะผู้บริหาร (Top เงินเดือน, ต้นทุนรายแผนก) — HR เรียกได้ 403
// ============================================================
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

// GET /api/stats/executive?year=&month= - รายงานผู้บริหาร (Executive เท่านั้น)
// ไม่ส่ง year/month = ใช้งวด payroll ล่าสุดอัตโนมัติ
router.get('/executive', requireAuth, requireRole('executive'), async (req: Request, res: Response) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  const period =
    Number.isInteger(year) && year > 2000 && Number.isInteger(month) && month >= 1 && month <= 12
      ? { year, month }
      : undefined;
  try {
    res.json(await getExecutiveStats(period));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/stats/executive', 'Failed to fetch executive report');
  }
});

export default router;
