// ============================================================
// /api/auth — สมัครสมาชิก (register), ล็อกอิน (login), ข้อมูลตัวเอง (me)
// register/login เป็นสาธารณะ (ไม่ต้องมี token), me ต้องล็อกอิน
// ============================================================
import express from 'express';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { requireAuth, signToken } from '../middleware/auth';
import { parseOr400, emailSchema } from '../validation';
import { registerUser, loginWithPassword, findUserById, type PublicUser } from '../services/auth';
import { handleRouteError } from './respond';

const router = express.Router();

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().trim().min(1, 'Full name is required'),
  role: z.enum(['hr', 'executive'], { message: 'Role must be hr or executive' }),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email and password are required'),
  password: z.string().min(1, 'Email and password are required'),
});

function issueToken(user: PublicUser): string {
  return signToken({ user_id: user.id, role: user.role, employee_id: user.employee_id });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const body = parseOr400(registerSchema, req.body, res);
  if (!body) return;
  try {
    const user = await registerUser(body);
    res.status(201).json({ token: issueToken(user), user });
  } catch (err) {
    handleRouteError(res, err, 'POST /api/auth/register', 'Failed to register');
  }
});

// POST /api/auth/login (accepts email or username)
router.post('/login', async (req: Request, res: Response) => {
  const body = parseOr400(loginSchema, req.body, res);
  if (!body) return;
  try {
    const user = await loginWithPassword(body.email, body.password);
    res.json({ token: issueToken(user), user });
  } catch (err) {
    handleRouteError(res, err, 'POST /api/auth/login', 'Failed to sign in');
  }
});

// GET /api/auth/me - current user (fresh data from DB)
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    res.json(await findUserById(req.user!.id));
  } catch (err) {
    handleRouteError(res, err, 'GET /api/auth/me', 'Failed to fetch user');
  }
});

export default router;
