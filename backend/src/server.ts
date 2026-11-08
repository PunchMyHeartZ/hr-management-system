// ============================================================
// จุดเริ่มต้นของ REST API — สร้าง Express app แล้ว mount router ทั้ง 10 โดเมน
// ลำดับชั้น: routes (HTTP) → services (business logic + SQL) → PostgreSQL
// ============================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
// router แยกตามโดเมน — แต่ละไฟล์เป็น HTTP layer บางๆ ที่เรียก services/
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

// middleware พื้นฐาน: อนุญาต cross-origin (frontend 5173 → backend 5000) + แปลง JSON body
app.use(cors());
app.use(express.json());

// health check สำหรับดูว่า server มีชีวิต (ไม่ต้องต่อ DB ไม่ต้องล็อกอิน)
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ต่อ router แต่ละโดเมนเข้ากับ path หลักของมัน
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

// path ที่ไม่มี router รองรับ → 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// error handler สุดท้าย: กัน error ปุ๊บปั๊บทำให้ server ล่ม — log แล้วตอบ 500
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`HR API listening on http://localhost:${PORT}`);
});
