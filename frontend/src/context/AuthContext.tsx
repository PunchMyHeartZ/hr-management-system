// ==============================
// AuthContext — จัดการสถานะการเข้าสู่ระบบ (login/register/logout) และ restore session จาก JWT
// ==============================
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../api/client';
import type { RegisterPayload, User } from '../api/schemas';

interface AuthContextValue {
  user: User | null;
  booting: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Provider ของระบบสมาชิก — เก็บ user ปัจจุบัน, ตรวจ token ตอนเปิดแอป และฟัง event 401 เพื่อ logout */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  // ส่วน restore session: ถ้ามี token ใน localStorage ให้ดึงข้อมูล user (/auth/me) — token เสียก็ลบทิ้ง
  useEffect(() => {
    const token = localStorage.getItem('hr_token');
    if (!token) {
      setBooting(false);
      return;
    }
    api
      .getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('hr_token'))
      .finally(() => setBooting(false));
  }, []);

  // ฟัง event 'hr-unauthorized' (ยิงจาก axios interceptor เมื่อโดน 401) เพื่อบังคับ logout
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('hr-unauthorized', onUnauthorized);
    return () => window.removeEventListener('hr-unauthorized', onUnauthorized);
  }, []);

  // ส่วน event handlers: login / register (เก็บ token ลง localStorage) และ logout (ลบ token)
  const login = useCallback(async (email: string, password: string) => {
    const { token, user: authenticated } = await api.login(email, password);
    localStorage.setItem('hr_token', token);
    setUser(authenticated);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { token, user: registered } = await api.register(payload);
    localStorage.setItem('hr_token', token);
    setUser(registered);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hr_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** hook เข้าถึงสถานะ authentication — ต้องใช้ภายใน AuthProvider เท่านั้น */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
