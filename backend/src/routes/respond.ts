import type { Response } from 'express';
import { ServiceError } from '../services/errors';

export function handleRouteError(res: Response, err: unknown, label: string, fallbackMessage: string): void {
  if (err instanceof ServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(`${label}:`, err instanceof Error ? err.message : err);
  res.status(500).json({ error: fallbackMessage });
}

export function parseIdParam(raw: unknown): number | null {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
