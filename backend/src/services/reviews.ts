import type { PoolClient } from 'pg';
import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

export interface ReviewRecord {
  review_id: number;
  employee_id: number;
  employee_name: string;
  department_name: string;
  period_year: number;
  reviewer_name: string;
  overall_score: string | null;
  strengths: string | null;
  improvements: string | null;
  status: string;
}

export interface GoalRecord {
  goal_id: number;
  review_id: number;
  title: string;
  weight: number;
  score: string | null;
}

export interface GoalInput {
  title: string;
  weight: number;
  score?: number | null;
}

export interface ReviewWrite {
  period_year: number;
  reviewer_name: string;
  overall_score?: number | null;
  strengths?: string | null;
  improvements?: string | null;
  status: 'draft' | 'final';
  goals: GoalInput[];
}

export interface ReviewFilter {
  employeeId: number | null;
  year: number | null;
}

const SELECT_REVIEWS = `
  SELECT  r.review_id,
          r.employee_id,
          e.first_name || ' ' || e.last_name AS employee_name,
          d.department_name,
          r.period_year,
          r.reviewer_name,
          r.overall_score,
          r.strengths,
          r.improvements,
          r.status
  FROM reviews r
  JOIN employees e ON e.employee_id = r.employee_id
  JOIN departments d ON d.department_id = e.department_id
`;

async function loadReview(reviewId: number): Promise<ReviewRecord> {
  const { rows } = await pool.query<ReviewRecord>(`${SELECT_REVIEWS} WHERE r.review_id = $1`, [reviewId]);
  if (rows.length === 0) throw new ServiceError(404, 'Review not found');
  return rows[0];
}

export async function findReview(reviewId: number): Promise<ReviewRecord> {
  return loadReview(reviewId);
}

export async function findReviewGoals(reviewId: number): Promise<GoalRecord[]> {
  const { rows } = await pool.query<GoalRecord>(
    'SELECT goal_id, review_id, title, weight, score FROM review_goals WHERE review_id = $1 ORDER BY goal_id',
    [reviewId]
  );
  return rows;
}

export async function listReviews(filter: ReviewFilter): Promise<ReviewRecord[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.employeeId !== null) {
    params.push(filter.employeeId);
    conditions.push(`r.employee_id = $${params.length}`);
  }
  if (filter.year !== null) {
    params.push(filter.year);
    conditions.push(`r.period_year = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query<ReviewRecord>(
    `${SELECT_REVIEWS} ${where} ORDER BY r.period_year DESC, e.employee_id`,
    params
  );
  return rows;
}

function mapWriteConstraintError(err: unknown): void {
  if (pgErrorCode(err) === '23505') {
    throw new ServiceError(409, 'A review already exists for this employee and year');
  }
  if (pgErrorCode(err) === '23503') {
    throw new ServiceError(400, 'Selected employee does not exist');
  }
}

async function insertGoals(client: PoolClient, reviewId: number, goals: GoalInput[]): Promise<void> {
  for (const goal of goals) {
    await client.query(
      'INSERT INTO review_goals (review_id, title, weight, score) VALUES ($1, $2, $3, $4)',
      [reviewId, goal.title, goal.weight, goal.score ?? null]
    );
  }
}

export async function createReview(employeeId: number, body: ReviewWrite): Promise<ReviewRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ review_id: number }>(
      `INSERT INTO reviews (employee_id, period_year, reviewer_name, overall_score, strengths, improvements, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING review_id`,
      [employeeId, body.period_year, body.reviewer_name, body.overall_score ?? null, body.strengths ?? null, body.improvements ?? null, body.status]
    );
    await insertGoals(client, rows[0].review_id, body.goals);
    await client.query('COMMIT');
    return loadReview(rows[0].review_id);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof ServiceError) throw err;
    mapWriteConstraintError(err);
    throw err;
  } finally {
    client.release();
  }
}

export async function updateReview(reviewId: number, body: ReviewWrite): Promise<ReviewRecord> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE reviews SET period_year = $1, reviewer_name = $2, overall_score = $3,
              strengths = $4, improvements = $5, status = $6
       WHERE review_id = $7`,
      [body.period_year, body.reviewer_name, body.overall_score ?? null, body.strengths ?? null, body.improvements ?? null, body.status, reviewId]
    );
    if (rowCount === 0) throw new ServiceError(404, 'Review not found');
    await client.query('DELETE FROM review_goals WHERE review_id = $1', [reviewId]);
    await insertGoals(client, reviewId, body.goals);
    await client.query('COMMIT');
    return loadReview(reviewId);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err instanceof ServiceError) throw err;
    mapWriteConstraintError(err);
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteReview(reviewId: number): Promise<void> {
  const { rowCount } = await pool.query('DELETE FROM reviews WHERE review_id = $1', [reviewId]);
  if (rowCount === 0) throw new ServiceError(404, 'Review not found');
}
