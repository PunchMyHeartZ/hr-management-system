import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
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

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await api.login(email, password);
    localStorage.setItem('hr_token', token);
    setUser(u);
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: u } = await api.register(payload);
    localStorage.setItem('hr_token', token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hr_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, booting }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
