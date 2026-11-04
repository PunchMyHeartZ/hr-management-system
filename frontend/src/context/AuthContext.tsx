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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

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

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('hr-unauthorized', onUnauthorized);
    return () => window.removeEventListener('hr-unauthorized', onUnauthorized);
  }, []);

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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
