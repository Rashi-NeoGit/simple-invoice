import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, fetchCurrentUser, login as loginRequest } from '../api/auth.api';
import { ACCESS_TOKEN_STORAGE_KEY } from '../api/client';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser()
      .then((profile) => setUser(profile))
      .catch(() => localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.accessToken);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
