-- ============================================================
-- HR Management System - PostgreSQL Schema
-- Run in pgAdmin Query Tool against a database named "hr_db"
-- (create it first: CREATE DATABASE hr_db;)
-- ============================================================
-- ลำดับการรัน: ไฟล์ที่ 1 จาก 5 (schema.sql -> migration_payroll.sql
--   -> migration_auth.sql -> migration_v2.sql -> migration_v3.sql)
-- ไฟล์นี้สร้างตารางหลัก 3 ตาราง: departments (แผนก),
--   employees (พนักงาน), leave_requests (ใบลา) พร้อม index 2 ตัว
--   และข้อมูลแผนกตัวอย่าง 4 แผนก
-- วิธีรัน: pgAdmin -> Query Tool -> เลือก database hr_db -> Execute
-- คำเตือน: ส่วนต้นมี DROP TABLE ทำลายตารางเดิมก่อนสร้างใหม่ ข้อมูลเดิมจะหายทั้งหมด

DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ------------------------------------------------------------
-- 1. DEPARTMENTS
-- ------------------------------------------------------------
-- ตารางแผนก: เก็บรายชื่อแผนกของบริษัท เป็นตารางแม่ให้ employees
--   อ้างอิงผ่าน department_id (แผนก 1 : พนักงานหลายคน)
CREATE TABLE departments (
    department_id   SERIAL PRIMARY KEY,
    -- UNIQUE กันตั้งชื่อแผนกซ้ำกัน
    department_name VARCHAR(100) NOT NULL UNIQUE,
    -- UNIQUE กันรหัสแผนกซ้ำกัน (เช่น ENG, HR)
    department_code VARCHAR(10)  NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. EMPLOYEES  (many employees -> one department)
-- ------------------------------------------------------------
-- ตารางพนักงาน: เก็บข้อมูลส่วนตัว ตำแหน่ง เงินเดือน สถานะการทำงาน
--   ผูกกับ departments ด้วย FK department_id
CREATE TABLE employees (
    employee_id   SERIAL PRIMARY KEY,
    first_name    VARCHAR(100)  NOT NULL,
    last_name     VARCHAR(100)  NOT NULL,
    -- UNIQUE กันอีเมลพนักงานซ้ำกัน (อีเมลใช้ระบุตัวตน)
    email         VARCHAR(255)  NOT NULL UNIQUE,
    phone         VARCHAR(20),
    position      VARCHAR(100)  NOT NULL,
    -- RESTRICT: ลบแผนกไม่ได้ถ้ายังมีพนักงานอยู่ในแผนกนั้น (กันพนักงานกำพร้า)
    department_id INT           NOT NULL
                  REFERENCES departments(department_id) ON DELETE RESTRICT,
    hire_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
    -- CHECK กันเงินเดือนติดลบ
    salary        NUMERIC(12,2) NOT NULL CHECK (salary >= 0),
    -- CHECK กันสถานะที่ไม่รู้จัก ยอมรับเฉพาะ active / inactive / terminated
    status        VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'terminated')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- index สำหรับกรอง/JOIN ตามแผนก (เช่นหน้ารายชื่อพนักงานที่กรองตามแผนก)
CREATE INDEX idx_employees_department ON employees (department_id);

-- ------------------------------------------------------------
-- 3. LEAVE_REQUESTS  (many leave requests -> one employee)
-- ------------------------------------------------------------
-- ตารางใบลา: เก็บคำขอลาของพนักงานแต่ละครั้ง พร้อมประเภท ช่วงวันที่
--   และสถานะการอนุมัติ (พนักงาน 1 คนมีได้หลายใบลา)
CREATE TABLE leave_requests (
    leave_id    SERIAL PRIMARY KEY,
    -- CASCADE: ลบพนักงานแล้วใบลาของพนักงานคนนั้นถูกลบตาม
    employee_id INT          NOT NULL
                REFERENCES employees(employee_id) ON DELETE CASCADE,
    -- CHECK กันประเภทการลาที่ไม่รู้จัก ยอมรับเฉพาะ 4 ประเภท
    leave_type  VARCHAR(30)  NOT NULL
                CHECK (leave_type IN ('annual', 'sick', 'personal', 'unpaid')),
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    reason      TEXT,
    -- CHECK กันสถานะใบลาที่ไม่รู้จัก
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- CHECK กันช่วงวันที่ลาไม่สมเหตุผล (วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น)
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

-- index สำหรับดึงประวัติใบลาของพนักงานหนึ่งคน และ JOIN กับ employees
CREATE INDEX idx_leave_requests_employee ON leave_requests (employee_id);

-- ============================================================
-- MOCK DATA (departments only - add employees via the app UI)
-- ============================================================
-- ข้อมูลแผนกตัวอย่าง 4 แผนก (ส่วนพนักงานให้เพิ่มผ่านหน้า App แทน)
INSERT INTO departments (department_name, department_code) VALUES
    ('Engineering', 'ENG'),
    ('Human Resources', 'HR'),
    ('Finance', 'FIN'),
    ('Marketing', 'MKT');
