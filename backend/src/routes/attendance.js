const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const pad = (n) => String(n).padStart(2, '0');

// GET /api/attendance - recent records with employee name
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT  a.attendance_id,
              a.employee_id,
              e.first_name || ' ' || e.last_name AS employee_name,
              to_char(a.work_date, 'YYYY-MM-DD') AS work_date,
              to_char(a.check_in, 'HH24:MI')     AS check_in,
              COALESCE(to_char(a.check_out, 'HH24:MI'), '-') AS check_out,
              CASE WHEN a.check_out IS NULL THEN NULL
                   ELSE ROUND(GREATEST(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 3600 - 1, 0)::numeric, 2)
              END AS worked_hours,
              a.ot_hours
      FROM attendance a
      JOIN employees e USING (employee_id)
      ORDER BY a.work_date DESC, a.check_in DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/attendance:', err.message);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// POST /api/attendance/check-in - clock in now
router.post('/check-in', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const employeeId = Number(req.body?.employee_id);
  if (!Number.isInteger(employeeId)) {
    return res.status(400).json({ error: 'A valid employee is required' });
  }
  const now = new Date();
  const workDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const checkIn = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO attendance (employee_id, work_date, check_in)
       VALUES ($1, $2, $3)
       ON CONFLICT (employee_id, work_date) DO NOTHING
       RETURNING attendance_id, employee_id, work_date, check_in`,
      [employeeId, workDate, checkIn]
    );
    if (rows.length === 0) {
      return res.status(409).json({ error: 'Already clocked in today' });
    }
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Employee does not exist' });
    console.error('POST /api/attendance/check-in:', err.message);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// POST /api/attendance/check-out - clock out now, auto-compute OT hours
// OT = max(0, worked hours - 8), worked hours = (out - in) - 1h lunch break
router.post('/check-out', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const employeeId = Number(req.body?.employee_id);
  if (!Number.isInteger(employeeId)) {
    return res.status(400).json({ error: 'A valid employee is required' });
  }
  const now = new Date();
  const workDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const checkOut = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  try {
    const { rows: existing } = await pool.query(
      'SELECT attendance_id, check_in, check_out FROM attendance WHERE employee_id = $1 AND work_date = $2',
      [employeeId, workDate]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'No clock-in found for today' });
    }
    if (existing[0].check_out !== null) {
      return res.status(409).json({ error: 'Already clocked out today' });
    }
    const [h, m] = String(existing[0].check_in).split(':').map(Number);
    const inMin = h * 60 + m;
    const outMin = now.getHours() * 60 + now.getMinutes();
    const workedHours = Math.max(0, (outMin - inMin) / 60 - 1);
    const otHours = Math.max(0, Math.round((workedHours - 8) * 100) / 100);

    const { rows } = await pool.query(
      'UPDATE attendance SET check_out = $1, ot_hours = $2 WHERE attendance_id = $3 RETURNING *',
      [checkOut, otHours, existing[0].attendance_id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /api/attendance/check-out:', err.message);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

module.exports = router;
