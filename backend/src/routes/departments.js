const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/departments - list all departments (for dropdowns)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT department_id, department_name, department_code FROM departments ORDER BY department_name'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/departments:', err.message);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
