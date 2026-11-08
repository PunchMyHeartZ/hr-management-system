// ============================================================
// กล่องเครื่องมือ zod ใช้ร่วมกันทุก route (ชั้น HTTP)
// parseOr400 = validate แล้วไม่ผ่านตอบ 400 พร้อมข้อความภาษาคนอ่านทันที
// ============================================================
import type { Response } from 'express';
import { z } from 'zod';

/**
 * validate `input` ด้วย zod schema
 * - ผ่าน  → return ข้อมูลชนิด T พร้อมใช้
 * - ไม่ผ่าน → ตอบ 400 { error: ข้อความแรกที่ผิด } แล้ว return null
 * pattern ใน route: const body = parseOr400(schema, req.body, res); if (!body) return;
 */
export function parseOr400<T>(schema: z.ZodType<T>, input: unknown, res: Response): T | null {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request';
    res.status(400).json({ error: message });
    return null;
  }
  return parsed.data;
}

// อีเมล: ตัดช่องว่าง แปลงเป็นตัวเล็ก แล้วเช็ครูปแบบ
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('A valid email is required'));

// วันที่รูปแบบ YYYY-MM-DD เท่านั้น (กัน date แปลกๆ หลุดเข้า DB)
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/** id แบบ positive (1,2,3,...) — รับค่าจาก string/number แล้วแปลงให้ */
export const positiveIdSchema = (message: string) =>
  z.preprocess(
    (v) => Number(v),
    z.number().int().positive(message)
  );

/** id แบบ integer ไม่จำกัดวิธีเครื่องหมาย (ใช้กับ employee_id ที่ validate เองว่ามีอยู่จริง) */
export const numericIdSchema = (message: string) =>
  z.preprocess(
    (v) => Number(v),
    z.number().int(message)
  );
