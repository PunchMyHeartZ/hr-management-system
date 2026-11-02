-- ============================================================
-- HR System - Payroll / Attendance migration
-- Run after schema.sql (safe to re-run)
-- ============================================================

-- Attendance: check-in / check-out per employee per day
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id SERIAL PRIMARY KEY,
    employee_id   INT  NOT NULL
                  REFERENCES employees(employee_id) ON DELETE CASCADE,
    work_date     DATE NOT NULL,
    check_in      TIME NOT NULL,
    check_out     TIME,
    ot_hours      NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, work_date)
);

-- Annual bonus per employee per year
CREATE TABLE IF NOT EXISTS bonuses (
    bonus_id    SERIAL PRIMARY KEY,
    employee_id INT  NOT NULL
                REFERENCES employees(employee_id) ON DELETE CASCADE,
    bonus_year  INT  NOT NULL CHECK (bonus_year BETWEEN 2000 AND 2100),
    amount      NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    UNIQUE (employee_id, bonus_year)
);

-- Computed monthly payslips
CREATE TABLE IF NOT EXISTS payroll_records (
    payroll_id       SERIAL PRIMARY KEY,
    employee_id      INT  NOT NULL
                     REFERENCES employees(employee_id) ON DELETE CASCADE,
    pay_period_year  INT  NOT NULL,
    pay_period_month INT  NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
    base_salary      NUMERIC(12,2) NOT NULL,
    ot_hours         NUMERIC(7,2)  NOT NULL DEFAULT 0,
    ot_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
    bonus            NUMERIC(12,2) NOT NULL DEFAULT 0,
    sso              NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax              NUMERIC(12,2) NOT NULL DEFAULT 0,
    net_pay          NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employee_id, pay_period_year, pay_period_month)
);

