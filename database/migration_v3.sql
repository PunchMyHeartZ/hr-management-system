-- Migration v3: announcements, performance reviews, recruitment, employee self-service
-- Run against hr_db (idempotent: safe to re-run)
-- ลำดับการรัน: ไฟล์ที่ 5 จาก 5 ไฟล์สุดท้าย (รันหลัง migration_v2.sql)
-- ไฟล์นี้สร้างตาราง 5 ตาราง: announcements (ประกาศบริษัท),
--   reviews + review_goals (ประกวดผลงาน), positions + applicants (รับสมัครงาน)
--   และแก้ตาราง users ให้รองรับบทบาท employee (self-service)
-- วิธีรัน: pgAdmin -> Query Tool -> เลือก database hr_db -> Execute
--   (ครอบทั้งหมดด้วย BEGIN/COMMIT ถ้าคำสั่งใดพังจะ rollback ทั้งชุด)

BEGIN;

-- Self-service: link user accounts to employees + allow 'employee' role
-- เชื่อมบัญชีผู้ใช้เข้ากับข้อมูลพนักงานแบบ 1-1 (SET NULL: ลบพนักงานแล้ว
--   บัญชียังอยู่ แต่ไม่ผูกกับพนักงานคนใดอีก)
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id INT REFERENCES employees(employee_id) ON DELETE SET NULL;
-- index UNIQUE บังคับให้พนักงาน 1 คน ผูกกับบัญชีได้ไม่เกิน 1 บัญชี
--   (แถวที่ employee_id เป็น NULL คือบัญชีที่ยังไม่ผูกพนักงาน จึงไม่ถูกบังคับ)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee ON users(employee_id) WHERE employee_id IS NOT NULL;
-- ขยาย CHECK ของ role ให้ยอมรับบทบาท 'employee' เพิ่มจาก hr/executive
--   (ต้อง DROP constraint เดิมก่อน เพราะ ADD ชื่อซ้ำไม่ได้)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('hr', 'executive', 'employee'));

-- Company announcements
-- ตารางประกาศบริษัท: ข่าวสารที่ HR/ผู้บริหารโพสต์ให้พนักงานอ่าน
--   (created_by ชี้ไป users — SET NULL: ลบผู้ใช้แล้วประกาศยังอยู่)
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  created_by  INT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance reviews
-- ตารางผลประเมินผลงานรายปี: คะแนนรวม จุดแข็ง จุดพัฒนา
--   (พนักงาน 1 คน ต่อ 1 ปี ได้ 1 ฉบับ)
CREATE TABLE IF NOT EXISTS reviews (
  review_id     SERIAL PRIMARY KEY,
  -- CASCADE: ลบพนักงานแล้วผลประเมินของคนนั้นถูกลบตาม
  employee_id   INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  period_year   INT NOT NULL,
  reviewer_name VARCHAR(150) NOT NULL,
  overall_score NUMERIC(4,2),
  strengths     TEXT,
  improvements  TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- UNIQUE กันพนักงานถูกประเมินซ้ำปีเดียวกัน
  UNIQUE (employee_id, period_year)
);
-- index สำหรับดึงประวัติผลประเมินของพนักงาน 1 คน / JOIN กับ employees
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON reviews(employee_id);

-- ตารางเป้าหมาย (Goals) ของแต่ละผลประเมิน: เก็บชื่อเป้าหมาย น้ำหนัก
--   และคะแนนที่ได้ ใช้ถ่วงน้ำหนักคำนวณ overall_score
CREATE TABLE IF NOT EXISTS review_goals (
  goal_id   SERIAL PRIMARY KEY,
  -- CASCADE: ลบผลประเมินแล้วเป้าหมายในฉบับนั้นถูกลบตาม
  review_id INT NOT NULL REFERENCES reviews(review_id) ON DELETE CASCADE,
  title     VARCHAR(255) NOT NULL,
  weight    INT NOT NULL DEFAULT 1,
  score     NUMERIC(4,2)
);
-- index สำหรับดึงเป้าหมายทั้งหมดของผลประเมิน 1 ฉบับ
CREATE INDEX IF NOT EXISTS idx_review_goals_review ON review_goals(review_id);

-- Recruitment
-- ตารางตำแหน่งงานที่เปิดรับ: ชื่อตำแหน่ง แผนก จำนวนที่รับ (headcount)
--   (SET NULL: ลบแผนกแล้วตำแหน่งยังอยู่แต่ไม่ผูกแผนก)
CREATE TABLE IF NOT EXISTS positions (
  position_id   SERIAL PRIMARY KEY,
  title         VARCHAR(150) NOT NULL,
  department_id INT REFERENCES departments(department_id) ON DELETE SET NULL,
  description   TEXT,
  headcount     INT NOT NULL DEFAULT 1,
  status        VARCHAR(20) NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ตารางผู้สมัครงาน: เก็บข้อมูลผู้สมัครของแต่ละตำแหน่งและสถานะ pipeline
--   (CASCADE: ลบตำแหน่งแล้วผู้สมัครของตำแหน่งนั้นถูกลบตาม)
CREATE TABLE IF NOT EXISTS applicants (
  applicant_id SERIAL PRIMARY KEY,
  position_id  INT NOT NULL REFERENCES positions(position_id) ON DELETE CASCADE,
  full_name    VARCHAR(150) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(20),
  status       VARCHAR(20) NOT NULL DEFAULT 'applied',
  notes        TEXT,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- index สำหรับกรอง/JOIN ผู้สมัครตามตำแหน่งที่สมัคร
CREATE INDEX IF NOT EXISTS idx_applicants_position ON applicants(position_id);

COMMIT;
