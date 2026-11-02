const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['hr', 'executive'];

function signToken(user) {
  return jwt.sign(
    { id: user.user_id, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

function publicUser(u) {
  return { id: u.user_id, username: u.username, email: u.email, full_name: u.full_name, role: u.role };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const b = req.body || {};
  const username = String(b.username ?? '').trim();
  const email = String(b.email ?? '').trim().toLowerCase();
  const password = String(b.password ?? '');
  const fullName = String(b.full_name ?? '').trim();
  const role = String(b.role ?? '').trim();

  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!fullName) return res.status(400).json({ error: 'Full name is required' });
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Role must be hr or executive' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, email, full_name, role`,
      [username, email, hash, fullName, role]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username or email already exists' });
    console.error('POST /api/auth/register:', err.message);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// POST /api/auth/login (accepts email or username)
router.post('/login', async (req, res) => {
  const identifier = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR LOWER(username) = $1',
      [identifier]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('POST /api/auth/login:', err.message);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

// GET /api/auth/me - current user (fresh data from DB)
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT user_id, username, email, full_name, role FROM users WHERE user_id = $1',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'User not found' });
    res.json(publicUser(rows[0]));
  } catch (err) {
    console.error('GET /api/auth/me:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
