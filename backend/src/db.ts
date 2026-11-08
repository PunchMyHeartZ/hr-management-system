// ============================================================
// Connection pool ของ PostgreSQL (node-postgres)
// pool = คิว connection ใช้ซ้ำได้ ไม่ต้องเปิด-ปิดทุก request (เร็วกว่ามาก)
// config อ่านจากไฟล์ .env
// ============================================================
import 'dotenv/config';
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'hr_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,                          // connection สูงสุดพร้อมกัน
  idleTimeoutMillis: 30000,         // ปิด connection ที่เฉยๆ เกิน 30 วิ
  connectionTimeoutMillis: 5000,    // หมดเวลาถ้าต่อ DB ไม่ได้ใน 5 วิ
});

/**
 * ดึง error code ของ PostgreSQL ออกจาก error ก้อนไหนก็ได้
 * ใช้แปลง constraint error เป็น HTTP response เช่น
 * 23505 = ข้อมูลซ้ำ (UNIQUE), 23503 = FK ไม่ตรง
 */
export function pgErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return undefined;
}
