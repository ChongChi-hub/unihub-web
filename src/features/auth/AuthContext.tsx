import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  clearStoredSession,
  getStoredTokens,
  http,
  setStoredSession,
  type ApiEnvelope,
} from '../../shared/api/http';

export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const USER_KEY = 'unihub_user';

// eslint-disable-next-line react-refresh/only-export-components
export function getHomeRouteForRoles(roles: UserRole[]): string {
  if (roles.includes('ADMIN')) return '/admin';
  if (roles.includes('LECTURER')) return '/lecturer';
  return '/student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await http.post<
      ApiEnvelope<{
        accessToken: string;
        refreshToken: string;
        user: AuthUser;
      }>
    >('/api/v1/auth/login', { email, password });

    const { accessToken, refreshToken, user: nextUser } = res.data.data;
    setStoredSession(accessToken, refreshToken, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    const { refreshToken } = getStoredTokens();
    try {
      if (refreshToken) {
        await http.post('/api/v1/auth/logout', { refreshToken });
      }
    } finally {
      clearStoredSession();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
