// ============================================================
// ตัวช่วยกลางของชั้น routes — แปลง error เป็น HTTP response
// และแปลง :id จาก path parameter เป็นตัวเลขให้ทุก route ใช้ร่วมกัน
// ============================================================
import type { Response } from 'express';
import { ServiceError } from '../services/errors';

/**
 * จับ error จาก service แล้วตอบกลับ:
 * - ServiceError → ใช้ status + message ของมัน (409/404/400/401 ฯลฯ)
 * - error อื่น → log ฝั่ง server แล้วตอบ 500 (ไม่เผยรายละเอียดภายในออกไป)
 */
export function handleRouteError(res: Response, err: unknown, label: string, fallbackMessage: string): void {
  if (err instanceof ServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(`${label}:`, err instanceof Error ? err.message : err);
  res.status(500).json({ error: fallbackMessage });
}

/** แปลง path parameter เป็น id ตัวเลข (1, 2, 3, ...) — ไม่ใช่เลขบวก = null เพื่อตอบ 400 */
export function parseIdParam(raw: unknown): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
