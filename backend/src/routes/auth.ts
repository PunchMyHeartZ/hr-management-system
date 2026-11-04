import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { pool, pgErrorCode } from '../db';
import { requireAuth, signToken } from '../middleware/auth';
import { parseOr400, emailSchema } from '../validation';

const router = express.Router();

interface UserRow {
  user_id: number;
  username: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: string;
  employee_id?: number | null;
}

function publicUser(u: UserRow) {
  return {
    id: u.user_id,
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    employee_id: u.employee_id ?? null,
  };
}

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

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const body = parseOr400(registerSchema, req.body, res);
  if (!body) return;

  try {
    const hash = await bcrypt.hash(body.password, 10);
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, email, full_name, role`,
      [body.username, body.email, hash, body.full_name, body.role]
    );
    const user = rows[0];
    if (!user) throw new Error('Insert returned no rows');
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (pgErrorCode(err) === '23505') {
      res.status(409).json({ error: 'Username or email already exists' });
      return;
    }
    console.error('POST /api/auth/register:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// POST /api/auth/login (accepts email or username)
router.post('/login', async (req: Request, res: Response) => {
  const body = parseOr400(loginSchema, req.body, res);
  if (!body) return;

  try {
    const { rows } = await pool.query<UserRow>(
      'SELECT * FROM users WHERE email = $1 OR LOWER(username) = $1',
      [body.email]
    );
    const user = rows[0];
    if (!user || !user.password_hash || !(await bcrypt.compare(body.password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('POST /api/auth/login:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// GET /api/auth/me - current user (fresh data from DB)
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const auth = req.user!;
  try {
    const { rows } = await pool.query<UserRow>(
      'SELECT user_id, username, email, full_name, role, employee_id FROM users WHERE user_id = $1',
      [auth.id]
    );
    if (rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json(publicUser(rows[0]));
  } catch (err) {
    console.error('GET /api/auth/me:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
