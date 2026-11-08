import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

export interface LeaveRecord {
  leave_id: number;
  employee_id: number;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string;
}

export interface LeaveInput {
  employee_id: number;
  leave_type: 'annual' | 'sick' | 'personal' | 'unpaid';
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface CreatedLeave {
  leave_id: number;
  employee_id: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
}

export async function listLeaves(scope: number | null): Promise<LeaveRecord[]> {
  const { rows } = await pool.query<LeaveRecord>(`
    SELECT  l.leave_id,
            l.employee_id,
            e.first_name || ' ' || e.last_name AS employee_name,
            l.leave_type,
            to_char(l.start_date, 'YYYY-MM-DD') AS start_date,
            to_char(l.end_date,   'YYYY-MM-DD') AS end_date,
            (l.end_date - l.start_date + 1)     AS total_days,
            l.reason,
            l.status
    FROM leave_requests l
    JOIN employees e ON e.employee_id = l.employee_id
    ${scope ? 'WHERE l.employee_id = $1' : ''}
    ORDER BY l.leave_id DESC
  `, scope ? [scope] : []);
  return rows;
}

export async function createLeave(body: LeaveInput): Promise<CreatedLeave> {
  try {
    const { rows } = await pool.query<CreatedLeave>(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING leave_id, employee_id, leave_type, start_date, end_date, reason, status`,
      [body.employee_id, body.leave_type, body.start_date, body.end_date, body.reason]
    );
    return rows[0];
  } catch (err) {
    if (pgErrorCode(err) === '23503') {
      throw new ServiceError(400, 'Selected employee does not exist');
    }
    throw err;
  }
}

export async function setLeaveStatus(id: number, status: 'approved' | 'rejected'): Promise<{ leave_id: number; status: string }> {
  const { rows } = await pool.query<{ leave_id: number; status: string }>(
    'UPDATE leave_requests SET status = $1 WHERE leave_id = $2 RETURNING leave_id, status',
    [status, id]
  );
  if (rows.length === 0) throw new ServiceError(404, 'Leave request not found');
  return rows[0];
}
