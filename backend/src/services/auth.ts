import bcrypt from 'bcryptjs';
import { pool, pgErrorCode } from '../db';
import { ServiceError } from './errors';

interface UserRow {
  user_id: number;
  username: string;
  email: string;
  password_hash?: string;
  full_name: string;
  role: string;
  employee_id?: number | null;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  employee_id: number | null;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  role: 'hr' | 'executive';
}

function publicUser(u: UserRow): PublicUser {
  return {
    id: u.user_id,
    username: u.username,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    employee_id: u.employee_id ?? null,
  };
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const hash = await bcrypt.hash(input.password, 10);
  try {
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (username, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, username, email, full_name, role`,
      [input.username, input.email, hash, input.full_name, input.role]
    );
    const user = rows[0];
    if (!user) throw new Error('Insert returned no rows');
    return publicUser(user);
  } catch (err) {
    if (pgErrorCode(err) === '23505') {
      throw new ServiceError(409, 'Username or email already exists');
    }
    throw err;
  }
}

export async function loginWithPassword(identifier: string, password: string): Promise<PublicUser> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1 OR LOWER(username) = $1',
    [identifier]
  );
  const user = rows[0];
  if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ServiceError(401, 'Invalid credentials');
  }
  return publicUser(user);
}

export async function findUserById(userId: number): Promise<PublicUser> {
  const { rows } = await pool.query<UserRow>(
    'SELECT user_id, username, email, full_name, role, employee_id FROM users WHERE user_id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user) throw new ServiceError(401, 'User not found');
  return publicUser(user);
}
