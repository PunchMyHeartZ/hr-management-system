-- ============================================================
-- HR System - Payroll / Attendance migration
-- Run after schema.sql (safe to re-run)
-- ============================================================
-- ลำดับการรัน: ไฟล์ที่ 2 จาก 5 (ต้องรัน schema.sql ให้เสร็จก่อน
--   เพราะทุกตารางในไฟล์นี้อ้างอิง employees)
-- ไฟล์นี้สร้างตาราง 3 ตาราง: attendance (ลงเวลางาน),
--   bonuses (โบนัสรายปี), payroll_records (สลิปเงินเดือนรายเดือน)
-- วิธีรัน: pgAdmin -> Query Tool -> เลือก database hr_db -> Execute
--   (ใช้ CREATE TABLE IF NOT EXISTS รันซ้ำได้)

-- Attendance: check-in / check-out per employee per day
-- ตารางลงเวลา: เก็บเวลาเข้า-ออกงานและชั่วโมง OT ของพนักงานรายวัน
--   (ใช้เป็นข้อมูลตั้งต้นสำหรับคำนวณเงินเดือน)
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id SERIAL PRIMARY KEY,
    -- CASCADE: ลบพนักงานแล้วประวัติการลงเวลาถูกลบตาม
    employee_id   INT  NOT NULL
                  REFERENCES employees(employee_id) ON DELETE CASCADE,
    work_date     DATE NOT NULL,
    check_in      TIME NOT NULL,
    check_out     TIME,
    ot_hours      NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- UNIQUE กันพนักงานลงเวลาซ้ำวันเดียวกัน (1 คน ต่อ 1 วัน ได้ 1 แถว)
    UNIQUE (employee_id, work_date)
);

-- Annual bonus per employee per year
-- ตารางโบนัส: เก็บโบนัสประจำปีของพนักงานแต่ละคน
CREATE TABLE IF NOT EXISTS bonuses (
    bonus_id    SERIAL PRIMARY KEY,
    -- CASCADE: ลบพนักงานแล้วข้อมูลโบนัสถูกลบตาม
    employee_id INT  NOT NULL
                REFERENCES employees(employee_id) ON DELETE CASCADE,
    -- CHECK กันปีโบนัสออกนอกช่วง 2000-2100
    bonus_year  INT  NOT NULL CHECK (bonus_year BETWEEN 2000 AND 2100),
    -- CHECK กันจำนวนโบนัสติดลบ
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    -- UNIQUE กันพนักงานมีโบนัสซ้ำปีเดียวกัน
    UNIQUE (employee_id, bonus_year)
);

-- Computed monthly payslips
-- ตารางสลิปเงินเดือน: เก็บผลคำนวณเงินเดือนรายเดือนของพนักงาน
--   (เงินเดือน + OT + โบนัส หัก SSO และภาษี เหลือเป็น net_pay)
CREATE TABLE IF NOT EXISTS payroll_records (
    payroll_id       SERIAL PRIMARY KEY,
    -- CASCADE: ลบพนักงานแล้วสลิปเงินเดือนถูกลบตาม
    employee_id      INT  NOT NULL
                     REFERENCES employees(employee_id) ON DELETE CASCADE,
    pay_period_year  INT  NOT NULL,
    -- CHECK กันเดือนออกนอกช่วง 1-12
    pay_period_month INT  NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
    base_salary      NUMERIC(12,2) NOT NULL,
    ot_hours         NUMERIC(7,2)  NOT NULL DEFAULT 0,
    ot_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus            NUMERIC(12,2) NOT NULL DEFAULT 0,
    sso              NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax              NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay          NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- UNIQUE กันพนักงานมี payslip ซ้ำเดือนเดียวกัน (1 คน ต่อเดือน ได้ 1 สลิป)
    UNIQUE (employee_id, pay_period_year, pay_period_month)
);

