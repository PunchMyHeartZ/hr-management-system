-- ============================================================
-- HR System - Auth migration (users table)
-- Seeding demo accounts is done by the node migration runner
-- (password hashes are generated with bcryptjs).
-- ============================================================
-- ลำดับการรัน: ไฟล์ที่ 3 จาก 5 (รันหลัง schema.sql และ migration_payroll.sql)
-- ไฟล์นี้สร้างตารางเดียวคือ users สำหรับระบบสมาชิก/ล็อกอินด้วย JWT
-- วิธีรัน: pgAdmin -> Query Tool -> เลือก database hr_db -> Execute
--   (ใช้ IF NOT EXISTS รันซ้ำได้)
-- บัญชีทดลอง (demo accounts): hr@company.com และ exec@company.com
--   รหัสผ่านของบัญชีทดลองถูก seed โดย node migration runner ในรูปแบบ
--   bcrypt hash (สร้างด้วย bcryptjs) ไม่ได้เก็บรหัสผ่านเป็นข้อความธรรมดา

-- ตารางผู้ใช้งานระบบ: บัญชีสำหรับล็อกอิน (HR / ผู้บริหาร)
--   password_hash เก็บ bcrypt hash ของรหัสผ่าน ไม่ใช่รหัสผ่านจริง
CREATE TABLE IF NOT EXISTS users (
    user_id       SERIAL PRIMARY KEY,
    -- UNIQUE กัน username ซ้ำกัน
    username      VARCHAR(50)  NOT NULL UNIQUE,
    -- UNIQUE กัน email ซ้ำกัน
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(150) NOT NULL,
    -- CHECK กันบทบาทที่ไม่รู้จัก ยอมรับเฉพาะ hr / executive
    role          VARCHAR(20)  NOT NULL DEFAULT 'executive'
                  CHECK (role IN ('hr', 'executive')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
