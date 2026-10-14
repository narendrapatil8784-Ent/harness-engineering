import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as authApi from '../api/authApi';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (token && email) {
      setUser({ token, email, isAdmin });
    }
  }, []);

  const login = async (email: string, password: string) => {
    const userData = await authApi.login(email, password);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('isAdmin', String(userData.isAdmin));
    setUser(userData);
  };

  const register = async (email: string, password: string) => {
    const userData = await authApi.register(email, password);
    localStorage.setItem('token', userData.token);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('isAdmin', String(userData.isAdmin));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isAdmin');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
