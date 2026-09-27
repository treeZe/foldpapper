import type { ReactNode } from 'react';
import { createBrowserRouter, Link, Navigate, RouterProvider, useLocation } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { EmptyState, Spinner } from './components/ui';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { BoardPage } from './pages/BoardPage';
import { CreatePinPage } from './pages/CreatePinPage';
import { HomePage } from './pages/HomePage';
import { PinPage } from './pages/PinPage';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function NotFound() {
  return (
    <EmptyState
      title="Такой страницы нет"
      text="Кажется, этот перец уже съели."
      action={
        <Link to="/" className="button button--chili">
          На главную
        </Link>
      }
    />
  );
}

/** Пока проверяем сохранённый токен, не рендерим страницы — иначе мигнёт гостевая версия. */
function Boot({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  return loading ? <Spinner /> : children;
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: (
      <Boot>
        <Layout />
      </Boot>
    ),
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <SearchPage explore /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/pin/:id', element: <PinPage /> },
      { path: '/u/:username', element: <ProfilePage /> },
      { path: '/board/:id', element: <BoardPage /> },
      { path: '/create', element: <RequireAuth><CreatePinPage /></RequireAuth> },
      { path: '/settings', element: <RequireAuth><SettingsPage /></RequireAuth> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
