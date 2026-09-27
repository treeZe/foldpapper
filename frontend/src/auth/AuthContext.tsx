import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler, tokenStore } from '../api/client';
import { authApi, usersApi } from '../api/endpoints';
import type { AuthResponse, User } from '../api/types';
import { useToast } from '../components/Toast';

interface AuthState {
  user: User | null;
  /** true, пока проверяем сохранённый токен при старте */
  loading: boolean;
  login: (login: string, password: string) => Promise<User>;
  register: (body: { username: string; email: string; password: string; displayName?: string }) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    // myPepper и прочие персональные поля больше не актуальны
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler((message) => {
      logout();
      toast(message === 'Аккаунт заблокирован' ? 'Ваш аккаунт заблокирован модератором' : 'Сессия истекла, войдите снова', 'error');
    });
    if (!tokenStore.get()) return;
    usersApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [logout, toast]);

  const accept = useCallback(
    (response: AuthResponse) => {
      tokenStore.set(response.accessToken);
      setUser(response.user);
      queryClient.clear();
      return response.user;
    },
    [queryClient],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: (login, password) => authApi.login(login, password).then(accept),
      register: (body) => authApi.register(body).then(accept),
      logout,
      setUser,
    }),
    [user, loading, accept, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth вне AuthProvider');
  return context;
}
