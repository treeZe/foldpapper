import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PepperIcon } from '../components/Icons';
import { Field, Logo } from '../components/ui';
import { HEAT_LEVELS } from '../lib/heat';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth__art" aria-hidden>
        <div className="auth__sheets">
          {HEAT_LEVELS.map((level, index) => (
            <span key={level.value} className="auth__sheet" style={{ background: level.color, rotate: `${(index - 2) * 7}deg` }}>
              <PepperIcon size={44} color="#fff6ea" />
            </span>
          ))}
        </div>
        <p>Сложите свои идеи в доски — и пусть лучшие обжигают.</p>
      </aside>
      <section className="auth__panel">
        <Link to="/" className="auth__logo">
          <Logo />
        </Link>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}

/** Куда вернуть пользователя после входа. */
function useReturnTo() {
  const location = useLocation();
  return (location.state as { from?: string } | null)?.from ?? '/';
}

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const returnTo = useReturnTo();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to={returnTo} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(form.login.trim(), form.password);
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell title="С возвращением" subtitle="Войдите, чтобы ставить перцы и собирать доски.">
      <form className="form" onSubmit={submit}>
        <Field label="Username или email">
          <input
            className="input"
            autoComplete="username"
            autoFocus
            required
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
        </Field>
        <Field label="Пароль">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="button button--chili button--lg button--block" disabled={pending}>
          {pending ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <p className="auth__switch">
        Ещё нет аккаунта? <Link to="/register" state={{ from: returnTo }}>Зарегистрироваться</Link>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const returnTo = useReturnTo();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to={returnTo} replace />;

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setErrors({});
    try {
      await register({ ...form, displayName: form.displayName.trim() || undefined });
      navigate(returnTo, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      else setError((e as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthShell title="Создать аккаунт" subtitle="Минута — и можно собирать самое острое.">
      <form className="form" onSubmit={submit}>
        <Field label="Username" error={errors.username} hint="Латиница, цифры, «_» и «.», от 3 до 30 символов">
          <input
            className="input"
            autoComplete="username"
            autoFocus
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_.]+"
            value={form.username}
            onChange={set('username')}
          />
        </Field>
        <Field label="Как вас называть" error={errors.displayName}>
          <input className="input" maxLength={80} placeholder="Необязательно" value={form.displayName} onChange={set('displayName')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Пароль" error={errors.password} hint="От 8 до 72 символов">
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        {error && <p className="form__error">{error}</p>}
        <button type="submit" className="button button--chili button--lg button--block" disabled={pending}>
          {pending ? 'Создаём…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="auth__switch">
        Уже есть аккаунт? <Link to="/login" state={{ from: returnTo }}>Войти</Link>
      </p>
    </AuthShell>
  );
}
