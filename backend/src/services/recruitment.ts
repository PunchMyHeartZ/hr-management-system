import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

export interface PositionRecord {
  position_id: number;
  title: string;
  department_id: number | null;
  department_name: string | null;
  description: string | null;
  headcount: number;
  status: string;
  applicant_count: string;
}

export interface ApplicantRecord {
  applicant_id: number;
  position_id: number;
  position_title: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: string;
  notes: string | null;
  applied_at: Date;
}

export interface PositionInput {
  title: string;
  department_id: number;
  description?: string | null;
  headcount: number;
  status: 'open' | 'closed';
}

export interface ApplicantInput {
  position_id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
}

export type ApplicantStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

const SELECT_POSITIONS = `
  SELECT  p.position_id, p.title, p.department_id, d.department_name,
          p.description, p.headcount, p.status,
          (SELECT count(*) FROM applicants a WHERE a.position_id = p.position_id) AS applicant_count
  FROM positions p
  LEFT JOIN departments d ON d.department_id = p.department_id
`;

const SELECT_APPLICANTS = `
  SELECT a.applicant_id, a.position_id, p.title AS position_title, a.full_name, a.email,
         a.phone, a.status, a.notes, a.applied_at
  FROM applicants a
  JOIN positions p ON p.position_id = a.position_id
`;

export async function listPositions(): Promise<PositionRecord[]> {
  const { rows } = await pool.query<PositionRecord>(
    `${SELECT_POSITIONS} ORDER BY p.status = 'open' DESC, p.created_at DESC`
  );
  return rows;
}

export async function createPosition(input: PositionInput): Promise<PositionRecord> {
  try {
    const { rows } = await pool.query<{ position_id: number }>(
      `INSERT INTO positions (title, department_id, description, headcount, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING position_id`,
      [input.title, input.department_id, input.description ?? null, input.headcount, input.status]
    );
    const { rows: full } = await pool.query<PositionRecord>(`${SELECT_POSITIONS} WHERE p.position_id = $1`, [rows[0].position_id]);
    return full[0];
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      throw new ServiceError(400, 'Selected department does not exist');
    }
    throw err;
  }
}

export async function updatePosition(id: number, input: PositionInput): Promise<PositionRecord> {
  const { rowCount } = await pool.query(
    `UPDATE positions SET title = $1, department_id = $2, description = $3, headcount = $4, status = $5
     WHERE position_id = $6`,
    [input.title, input.department_id, input.description ?? null, input.headcount, input.status, id]
  );
  if (rowCount === 0) throw new ServiceError(404, 'Position not found');
  const { rows } = await pool.query<PositionRecord>(`${SELECT_POSITIONS} WHERE p.position_id = $1`, [id]);
  return rows[0];
}

export async function deletePosition(id: number): Promise<void> {
  const { rows: used } = await pool.query<{ count: string }>(
    'SELECT count(*) AS count FROM applicants WHERE position_id = $1',
    [id]
  );
  if (Number(used[0].count) > 0) {
    throw new ServiceError(409, 'Cannot delete a position that has applicants');
  }
  const { rowCount } = await pool.query('DELETE FROM positions WHERE position_id = $1', [id]);
  if (rowCount === 0) throw new ServiceError(404, 'Position not found');
}

export async function listApplicants(positionId: number | null): Promise<ApplicantRecord[]> {
  const { rows } = await pool.query<ApplicantRecord>(
    `${SELECT_APPLICANTS} ${positionId ? 'WHERE a.position_id = $1' : ''} ORDER BY a.applied_at DESC`,
    positionId ? [positionId] : []
  );
  return rows;
}

export async function createApplicant(input: ApplicantInput): Promise<ApplicantRecord> {
  try {
    const { rows } = await pool.query<{ applicant_id: number }>(
      `INSERT INTO applicants (position_id, full_name, email, phone, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING applicant_id`,
      [input.position_id, input.full_name, input.email, input.phone ?? null, input.notes ?? null]
    );
    const { rows: full } = await pool.query<ApplicantRecord>(
      `${SELECT_APPLICANTS} WHERE a.applicant_id = $1`,
      [rows[0].applicant_id]
    );
    return full[0];
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      throw new ServiceError(400, 'Selected position does not exist');
    }
    throw err;
  }
}

export async function setApplicantStatus(id: number, status: ApplicantStatus): Promise<{ applicant_id: number; status: string }> {
  const { rows } = await pool.query<{ applicant_id: number; status: string }>(
    'UPDATE applicants SET status = $1 WHERE applicant_id = $2 RETURNING applicant_id, status',
    [status, id]
  );
  if (rows.length === 0) throw new ServiceError(404, 'Applicant not found');
  return rows[0];
}
