// ============================================================
// Prisma Client — ORM ทางเลือก (schema สะท้อน SQL ใน database/)
// โค้ดหลักใช้ raw SQL ผ่าน pool (db.ts) — ไฟล์นี้ไว้ให้ใครอยาก
// ใช้ Prisma query หรือรัน prisma studio (npm run db:studio)
// ============================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
