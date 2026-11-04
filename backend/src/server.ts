import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import employeesRouter from './routes/employees';
import departmentsRouter from './routes/departments';
import leavesRouter from './routes/leaves';
import attendanceRouter from './routes/attendance';
import payrollRouter from './routes/payroll';
import statsRouter from './routes/stats';
import announcementsRouter from './routes/announcements';
import reviewsRouter from './routes/reviews';
import recruitmentRouter from './routes/recruitment';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/leaves', leavesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/stats', statsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/recruitment', recruitmentRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HR API listening on http://localhost:${PORT}`);
});
