const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

const LEAVE_TYPES = ['annual', 'sick', 'personal', 'unpaid'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/leaves - all leave requests with employee name (JOIN)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT  l.leave_id,
              l.employee_id,
              e.first_name || ' ' || e.last_name AS employee_name,
              l.leave_type,
              to_char(l.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(l.end_date,   'YYYY-MM-DD') AS end_date,
              (l.end_date - l.start_date + 1)     AS total_days,
              l.reason,
              l.status
      FROM leave_requests l
      JOIN employees e ON e.employee_id = l.employee_id
      ORDER BY l.leave_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/leaves:', err.message);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// POST /api/leaves - submit a new leave request
router.post('/', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const b = req.body || {};
  const employeeId = Number(b.employee_id);
  const leaveType = String(b.leave_type ?? '').trim();
  const startDate = String(b.start_date ?? '').trim();
  const endDate = String(b.end_date ?? '').trim();
  const reason = String(b.reason ?? '').trim() || null;

  if (!Number.isInteger(employeeId)) return res.status(400).json({ error: 'A valid employee is required' });
  if (!LEAVE_TYPES.includes(leaveType)) return res.status(400).json({ error: 'Invalid leave type' });
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return res.status(400).json({ error: 'start_date and end_date must be in YYYY-MM-DD format' });
  }
  if (new Date(endDate) < new Date(startDate)) {
    return res.status(400).json({ error: 'end_date must be on or after start_date' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING leave_id, employee_id, leave_type, start_date, end_date, reason, status`,
      [employeeId, leaveType, startDate, endDate, reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Selected employee does not exist' });
    console.error('POST /api/leaves:', err.message);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// PATCH /api/leaves/:id/status - approve or reject
router.patch('/:id/status', requireAuth, requireRole('hr', 'executive'), async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid leave id' });
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE leave_requests SET status = $1 WHERE leave_id = $2 RETURNING leave_id, status',
      [status, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Leave request not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(`PATCH /api/leaves/${id}/status:`, err.message);
    res.status(500).json({ error: 'Failed to update leave status' });
  }
});

module.exports = router;
