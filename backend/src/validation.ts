import type { Response } from 'express';
import { z } from 'zod';

export function parseOr400<T>(schema: z.ZodType<T>, input: unknown, res: Response): T | null {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request';
    res.status(400).json({ error: message });
    return null;
  }
  return parsed.data;
}

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('A valid email is required'));

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const positiveIdSchema = (message: string) =>
  z.preprocess(
    (v) => Number(v),
    z.number().int().positive(message)
  );

export const numericIdSchema = (message: string) =>
  z.preprocess(
    (v) => Number(v),
    z.number().int(message)
  );
