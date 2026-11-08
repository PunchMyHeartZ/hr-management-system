-- ============================================================
-- HR System - v2 migration: leave quota
-- ============================================================
-- ลำดับการรัน: ไฟล์ที่ 4 จาก 5 (รันหลัง migration_auth.sql)
-- ไฟล์นี้ไม่ได้สร้างตารางใหม่ แค่เพิ่ม 1 คอลัมน์ในตาราง employees
--   คือ annual_leave_quota (สิทธิ์วันลารายปี)
-- วิธีรัน: pgAdmin -> Query Tool -> เลือก database hr_db -> Execute
--   (IF NOT EXISTS รันซ้ำได้)

-- เพิ่มสิทธิ์วันลาประจำปีให้พนักงานทุกคน ค่าเริ่มต้น 10 วัน
ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_leave_quota INT NOT NULL DEFAULT 10;
