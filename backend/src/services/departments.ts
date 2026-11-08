import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

export interface DepartmentRecord {
  department_id: number;
  department_name: string;
  department_code: string;
}

export interface DepartmentBody {
  department_name: string;
  department_code: string;
}

function mapDuplicateError(err: unknown): void {
  if (pgErrorCode(err) === '23505') {
    throw new ServiceError(409, 'Department name or code already exists');
  }
}

export async function listDepartments(): Promise<DepartmentRecord[]> {
  const { rows } = await pool.query<DepartmentRecord>(
    'SELECT department_id, department_name, department_code FROM departments ORDER BY department_name'
  );
  return rows;
}

export async function createDepartment(body: DepartmentBody): Promise<DepartmentRecord> {
  try {
    const { rows } = await pool.query<DepartmentRecord>(
      `INSERT INTO departments (department_name, department_code)
       VALUES ($1, $2)
       RETURNING department_id, department_name, department_code`,
      [body.department_name, body.department_code]
    );
    return rows[0];
  } catch (err) {
    mapDuplicateError(err);
    throw err;
  }
}

export async function updateDepartment(id: number, body: DepartmentBody): Promise<DepartmentRecord> {
  try {
    const { rows } = await pool.query<DepartmentRecord>(
      `UPDATE departments SET department_name = $1, department_code = $2
       WHERE department_id = $3
       RETURNING department_id, department_name, department_code`,
      [body.department_name, body.department_code, id]
    );
    if (rows.length === 0) throw new ServiceError(404, 'Department not found');
    return rows[0];
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    mapDuplicateError(err);
    throw err;
  }
}

export async function deleteDepartment(id: number): Promise<void> {
  const { rows: used } = await pool.query<{ count: string }>(
    'SELECT count(*) AS count FROM employees WHERE department_id = $1',
    [id]
  );
  if (Number(used[0].count) > 0) {
    throw new ServiceError(409, 'Cannot delete a department that still has employees');
  }
  const { rowCount } = await pool.query('DELETE FROM departments WHERE department_id = $1', [id]);
  if (rowCount === 0) throw new ServiceError(404, 'Department not found');
}
