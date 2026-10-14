import api from './axiosInstance';
import { User } from '../types';

interface AuthResponse {
  token: string;
  email: string;
  admin: boolean;  // Spring serializes isAdmin getter as "admin" (drops "is" prefix)
}

export async function register(email: string, password: string): Promise<User> {
  const { data } = await api.post<AuthResponse>('/auth/register', { email, password });
  return { token: data.token, email: data.email, isAdmin: data.admin };
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return { token: data.token, email: data.email, isAdmin: data.admin };
}
