// ============================================================
// Middleware ระบบสมาชิก + การจำกัดสิทธิ์ (RBAC)
// 3 บทบาท: hr / executive (จัดการได้ทุกอย่าง), employee (เห็นเฉพาะตัวเอง)
// ============================================================
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/** ผู้ใช้ที่ผูกเข้ากับ request หลังผ่าน requireAuth (มี req.user ให้ทุก route ใช้) */
export interface AuthUser {
  id: number;
  role: string;
  employeeId?: number | null;
}

// ขยาย type ของ Express ให้มี req.user (global augmentation)
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/** รูปร่าง user ตอนอยู่ใน DB (snake_case) ก่อนแปลงเป็น token payload */
interface TokenUser {
  user_id: number;
  role: string;
  employee_id?: number | null;
}

/** สร้าง JWT อายุ 7 วัน — payload มี id, role และ employeeId (ใช้ scope ข้อมูลพนักงาน) */
export function signToken(user: TokenUser): string {
  return jwt.sign(
    { id: user.user_id, role: user.role, employeeId: user.employee_id ?? null },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/** ตรวจ Bearer token: ไม่มี/หมดอายุ → 401, ผ่าน → แปะผู้ใช้ไว้ที่ req.user */
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

/**  factory สร้าง middleware จำกัดบทบาท: requireRole('hr','executive') → คนอื่นได้ 403 */
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
/** ใครดูข้อมูลพนักงานคนนี้ได้บ้าง — HR/ผู้บริหารดูได้หมด พนักงานดูได้เฉพาะตัวเอง */
export function canAccessEmployee(user: AuthUser | undefined, employeeId: number): boolean {
  if (!user) return false;
  if (user.role === 'hr' || user.role === 'executive') return true;
  return user.employeeId === employeeId;
}

// Resolves the effective employee scope for role-scoped listing endpoints
/** คำนวณ scope ของ endpoint แบบ list: พนักงานถูกบังคับเห็นเฉพาะตัวเอง (-1 = ไม่มีข้อมูลผูกก็ไม่เห็นอะไรเลย) */
export function employeeScope(req: Request): number | null {
  const user = req.user;
  if (!user) return null;
  if (user.role === 'employee') return user.employeeId ?? -1;
  const requested = Number(req.query.employee_id);
  return Number.isInteger(requested) && requested > 0 ? requested : null;
}
