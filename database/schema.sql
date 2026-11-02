-- ============================================================
-- HR Management System - PostgreSQL Schema
-- Run in pgAdmin Query Tool against a database named "hr_db"
-- (create it first: CREATE DATABASE hr_db;)
-- ============================================================

DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ------------------------------------------------------------
-- 1. DEPARTMENTS
-- ------------------------------------------------------------
CREATE TABLE departments (
    department_id   SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(10)  NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. EMPLOYEES  (many employees -> one department)
-- ------------------------------------------------------------
CREATE TABLE employees (
    employee_id   SERIAL PRIMARY KEY,
    first_name    VARCHAR(100)  NOT NULL,
    last_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(255)  NOT NULL UNIQUE,
    phone         VARCHAR(20),
    position      VARCHAR(100)  NOT NULL,
    department_id INT           NOT NULL
                  REFERENCES departments(department_id) ON DELETE RESTRICT,
    hire_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
    salary        NUMERIC(12,2) NOT NULL CHECK (salary >= 0),
    status        VARCHAR(20)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'inactive', 'terminated')),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_department ON employees (department_id);

-- ------------------------------------------------------------
-- 3. LEAVE_REQUESTS  (many leave requests -> one employee)
-- ------------------------------------------------------------
CREATE TABLE leave_requests (
    leave_id    SERIAL PRIMARY KEY,
    employee_id INT          NOT NULL
                REFERENCES employees(employee_id) ON DELETE CASCADE,
    leave_type  VARCHAR(30)  NOT NULL
                CHECK (leave_type IN ('annual', 'sick', 'personal', 'unpaid')),
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    reason      TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_employee ON leave_requests (employee_id);

-- ============================================================
-- MOCK DATA (departments only - add employees via the app UI)
-- ============================================================
INSERT INTO departments (department_name, department_code) VALUES
    ('Engineering', 'ENG'),
    ('Human Resources', 'HR'),
    ('Finance', 'FIN'),
    ('Marketing', 'MKT');
