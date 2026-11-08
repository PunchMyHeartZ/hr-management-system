import bcrypt from 'bcryptjs';
import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

export interface EmployeeRecord {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  department_id: number;
  department_name: string;
  hire_date: string;
  salary: string;
  status: string;
  annual_leave_quota: number;
  used_leave_days: string;
}

const SELECT_WITH_DEPARTMENT = `
  SELECT  e.employee_id,
          e.first_name,
          e.last_name,
          e.email,
          e.phone,
          e.position,
          e.department_id,
          d.department_name,
          to_char(e.hire_date, 'YYYY-MM-DD') AS hire_date,
          e.salary,
          e.status,
          e.annual_leave_quota,
          COALESCE((SELECT SUM(lr.end_date - lr.start_date + 1)
                    FROM leave_requests lr
                    WHERE lr.employee_id = e.employee_id
                      AND lr.leave_type = 'annual'
                      AND lr.status = 'approved'
                      AND EXTRACT(YEAR FROM lr.start_date) = EXTRACT(YEAR FROM CURRENT_DATE)), 0) AS used_leave_days
  FROM employees e
  JOIN departments d ON d.department_id = e.department_id
`;

export interface EmployeeWrite {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  department_id: number;
  hire_date: string | null;
  salary: number;
  annual_leave_quota: number;
}

export interface EmployeeUpdate extends EmployeeWrite {
  status: 'active' | 'inactive' | 'terminated';
}

export interface CreatedEmployee {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position: string;
  department_id: number;
  hire_date: string;
  salary: string;
  annual_leave_quota: number;
  status: string;
}

export interface EmployeeAccount {
  user_id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  employee_id: number;
}

function mapWriteConstraintError(err: unknown): void {
  if (pgErrorCode(err) === '23505') {
    throw new ServiceError(409, 'An employee with this email already exists');
  }
  if (pgErrorCode(err) === '23503') {
    throw new ServiceError(400, 'Selected department does not exist');
  }
}

export async function listEmployees(scope: number | null): Promise<EmployeeRecord[]> {
  if (scope !== null) {
    const { rows } = await pool.query<EmployeeRecord>(
      `${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`,
      [scope]
    );
    return rows;
  }
  const { rows } = await pool.query<EmployeeRecord>(`${SELECT_WITH_DEPARTMENT} ORDER BY e.employee_id`);
  return rows;
}

export async function findEmployee(id: number): Promise<EmployeeRecord> {
  const { rows } = await pool.query<EmployeeRecord>(`${SELECT_WITH_DEPARTMENT} WHERE e.employee_id = $1`, [id]);
  if (rows.length === 0) throw new ServiceError(404, 'Employee not found');
  return rows[0];
}

export async function createEmployee(body: EmployeeWrite): Promise<CreatedEmployee> {
  try {
    const { rows } = await pool.query<CreatedEmployee>(
      `INSERT INTO employees (first_name, last_name, email, phone, position, department_id, hire_date, salary, annual_leave_quota)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9)
       RETURNING employee_id, first_name, last_name, email, phone, position, department_id, hire_date, salary, annual_leave_quota, status`,
      [body.first_name, body.last_name, body.email, body.phone, body.position, body.department_id, body.hire_date, body.salary, body.annual_leave_quota]
    );
    return rows[0];
  } catch (err) {
    mapWriteConstraintError(err);
    throw err;
  }
}

export async function updateEmployee(id: number, body: EmployeeUpdate): Promise<EmployeeRecord> {
  try {
    const { rowCount } = await pool.query(
      `UPDATE employees SET first_name = $1, last_name = $2, email = $3, phone = $4,
              position = $5, department_id = $6, hire_date = COALESCE($7::date, hire_date),
              salary = $8, status = $9, annual_leave_quota = $10
       WHERE employee_id = $11`,
      [body.first_name, body.last_name, body.email, body.phone, body.position, body.department_id, body.hire_date, body.salary, body.status, body.annual_leave_quota, id]
    );
    if (rowCount === 0) throw new ServiceError(404, 'Employee not found');
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    mapWriteConstraintError(err);
    throw err;
  }
  return findEmployee(id);
}

export interface AccountInput {
  username: string;
  password: string;
}

export async function createEmployeeAccount(employeeId: number, input: AccountInput): Promise<EmployeeAccount> {
  const { rows: empRows } = await pool.query<{ first_name: string; last_name: string }>(
    'SELECT first_name, last_name FROM employees WHERE employee_id = $1',
    [employeeId]
  );
  const employee = empRows[0];
  if (!employee) throw new ServiceError(404, 'Employee not found');

  const { rows: existing } = await pool.query('SELECT user_id FROM users WHERE employee_id = $1', [employeeId]);
  if (existing.length > 0) throw new ServiceError(409, 'This employee already has a login');

  const hash = await bcrypt.hash(input.password, 10);
  try {
    const { rows } = await pool.query<EmployeeAccount>(
      `INSERT INTO users (username, email, password_hash, full_name, role, employee_id)
       VALUES ($1, $2, $3, $4, 'employee', $5)
       RETURNING user_id, username, email, full_name, role, employee_id`,
      [input.username, `${input.username.toLowerCase()}@hrms.local`, hash, `${employee.first_name} ${employee.last_name}`, employeeId]
    );
    return rows[0];
  } catch (err) {
    if (pgErrorCode(err) === '23505') {
      throw new ServiceError(409, 'Username already exists');
    }
    throw err;
  }
}
