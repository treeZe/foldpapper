import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { displayName } from '../lib/format';
import { LogoutIcon, MoonIcon, PlusIcon, SearchIcon, ShieldIcon, SunIcon } from './Icons';
import { Avatar, Logo } from './ui';

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('fp-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#16110f' : '#fbf6ef');
  }, [theme]);
  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))] as const;
}

function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const initial = location.pathname === '/search' ? (params.get('tag') ? `#${params.get('tag')}` : params.get('q') ?? '') : '';
  const [value, setValue] = useState(initial);

  useEffect(() => setValue(initial), [initial]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text) return;
    // «#тег» ищет по тегу, всё остальное — по тексту
    navigate(text.startsWith('#') ? `/search?tag=${encodeURIComponent(text.slice(1))}` : `/search?q=${encodeURIComponent(text)}`);
  };

  return (
    <form className="search" role="search" onSubmit={submit}>
      <SearchIcon size={18} />
      <input
        type="search"
        placeholder="Искать идеи или #тег"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Поиск"
      />
    </form>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  if (!user) {
    return (
      <div className="header__auth">
        <Link to="/login" className="button button--ghost">
          Войти
        </Link>
        <Link to="/register" className="button button--chili">
          Регистрация
        </Link>
      </div>
    );
  }

  return (
    <div className="user-menu">
      <button type="button" className="user-menu__trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <Avatar user={user} size={38} />
      </button>
      {open && (
        <>
          <div className="user-menu__backdrop" onClick={() => setOpen(false)} />
          <div className="user-menu__panel">
            <Link to={`/u/${user.username}`} className="user-menu__head">
              <Avatar user={user} size={44} />
              <span>
                <strong>{displayName(user)}</strong>
                <small className="muted">@{user.username}</small>
              </span>
            </Link>
            <Link to={`/u/${user.username}`}>Мой профиль</Link>
            <Link to={`/u/${user.username}?tab=boards`}>Мои доски</Link>
            <Link to={`/u/${user.username}?tab=peppered`}>Мои перцы</Link>
            <Link to="/settings">Настройки</Link>
            {user.role === 'ADMIN' && (
              <Link to="/admin" className="user-menu__admin">
                <ShieldIcon size={16} /> Админ-панель
              </Link>
            )}
            <button type="button" onClick={logout}>
              <LogoutIcon size={16} /> Выйти
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  const [theme, toggleTheme] = useTheme();

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <Link to="/" aria-label="На главную">
            <Logo />
          </Link>
          <nav className="header__nav">
            <NavLink to="/" end>
              Главная
            </NavLink>
            <NavLink to="/explore">Обзор</NavLink>
          </nav>
          <SearchBar />
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          {user && (
            <Link to="/create" className="button button--chili header__create">
              <PlusIcon size={18} /> <span>Создать</span>
            </Link>
          )}
          <UserMenu />
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <Logo compact />
        <span>Fold Papper — визуальные закладки для идей, которые жгут. Студенческий проект, {new Date().getFullYear()}.</span>
      </footer>
      <ScrollRestoration />
    </>
  );
}
