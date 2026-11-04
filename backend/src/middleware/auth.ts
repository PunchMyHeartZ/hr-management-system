import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  role: string;
  employeeId?: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

interface TokenUser {
  user_id: number;
  role: string;
  employee_id?: number | null;
}

export function signToken(user: TokenUser): string {
  return jwt.sign(
    { id: user.user_id, role: user.role, employeeId: user.employee_id ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const claims = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    req.user = {
      id: Number(claims.id),
      role: String(claims.role),
      employeeId: claims.employeeId == null ? null : Number(claims.employeeId),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: `This action requires role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
}

// HR/Executive can access anyone; employee accounts only their own record
export function canAccessEmployee(user: AuthUser | undefined, employeeId: number): boolean {
  if (!user) return false;
  if (user.role === 'hr' || user.role === 'executive') return true;
  return user.employeeId === employeeId;
}

// Resolves the effective employee scope for role-scoped listing endpoints
export function employeeScope(req: Request): number | null {
  const user = req.user;
  if (!user) return null;
  if (user.role === 'employee') return user.employeeId ?? -1;
  const requested = Number(req.query.employee_id);
  return Number.isInteger(requested) && requested > 0 ? requested : null;
}
