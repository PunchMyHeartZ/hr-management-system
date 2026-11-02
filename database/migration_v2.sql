-- ============================================================
-- HR System - v2 migration: leave quota
-- ============================================================

ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_leave_quota INT NOT NULL DEFAULT 10;
