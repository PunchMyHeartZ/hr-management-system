require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const employeesRouter = require('./routes/employees');
const departmentsRouter = require('./routes/departments');
const leavesRouter = require('./routes/leaves');
const attendanceRouter = require('./routes/attendance');
const payrollRouter = require('./routes/payroll');
const statsRouter = require('./routes/stats');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/stats', statsRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HR API listening on http://localhost:${PORT}`);
});
