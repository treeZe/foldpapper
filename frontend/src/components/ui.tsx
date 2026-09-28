import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { UserSummary } from '../api/types';
import { displayName } from '../lib/format';
import { CloseIcon } from './Icons';

const AVATAR_TONES = ['#d62d1f', '#f08a24', '#3f7d4f', '#7a4bd1', '#1f7a8c', '#c23b6b'];

export function Avatar({ user, size = 36 }: { user: UserSummary; size?: number }) {
  const name = displayName(user);
  if (user.avatarUrl) {
    return <img className="avatar" src={user.avatarUrl} alt={name} width={size} height={size} style={{ width: size, height: size }} />;
  }
  // цвет зависит от username, чтобы у человека он был постоянным
  const tone = AVATAR_TONES[[...user.username].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span className="avatar avatar--letter" style={{ width: size, height: size, background: tone, fontSize: size * 0.42 }} aria-label={name}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <svg className="logo__mark" width="34" height="34" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="var(--chili)" />
        <path d="M40 12c-2 0-4 2-4 5" stroke="var(--stem)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M36 18c9 0 14 8 10 18-4 10-14 17-26 16 10-5 12-12 10-19-1-6 0-15 6-15z" fill="#fff6ea" />
        <path d="M36 18 30 33l16 3" fill="#f3d3b6" />
      </svg>
      {!compact && (
        <span className="logo__text">
          Fold<span>Papper</span>
        </span>
      )}
    </span>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'compact' | 'wide';
}

export function Modal({ title, onClose, children, size }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  // портал в body: иначе окно наследует стили места, где объявлено (например, nowrap ячейки таблицы)
  return createPortal(
    <dialog
      ref={dialogRef}
      className={`modal${size ? ` modal--${size}` : ''}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // клик по подложке закрывает окно
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="modal__body">
        <header className="modal__header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть">
            <CloseIcon />
          </button>
        </header>
        {children}
      </div>
    </dialog>,
    document.body,
  );
}

/** Загрузка: квадратный лист складывается по диагонали и разворачивается обратно. */
export function Spinner({ label = 'Складываем перец…' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__sheet" aria-hidden>
        <span className="spinner__half" />
        <span className="spinner__flap" />
      </span>
      <span className="spinner__label">{label}</span>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Что-то подгорело"
      text={error.message}
      action={
        onRetry && (
          <button type="button" className="button button--ghost" onClick={onRetry}>
            Попробовать снова
          </button>
        )
      }
    />
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={`field${error ? ' field--error' : ''}`}>
      <span className="field__label">{label}</span>
      {children}
      {error ? <span className="field__error">{error}</span> : hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}
