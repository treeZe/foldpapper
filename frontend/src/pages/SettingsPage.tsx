import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { mediaApi, usersApi } from '../api/endpoints';
import type { User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { UploadIcon } from '../components/Icons';
import { useToast } from '../components/Toast';
import { Avatar, Field } from '../components/ui';

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const me = user as User;
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(me.displayName ?? '');
  const [bio, setBio] = useState(me.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl ?? '');

  const upload = useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
    onSuccess: (stored) => setAvatarUrl(stored.url),
    onError: (error) => toast(error.message, 'error'),
  });

  const save = useMutation({
    mutationFn: () => usersApi.updateMe({ displayName, bio, avatarUrl }),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['user', updated.username.toLowerCase()], updated);
      toast('Профиль сохранён', 'success');
    },
  });
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {};

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <div className="page page--narrow">
      <section className="page-head">
        <h1>Настройки профиля</h1>
        <p className="muted">
          Так вас видят другие — <Link to={`/u/${me.username}`}>посмотреть профиль</Link>
        </p>
      </section>

      <form className="form settings" onSubmit={submit}>
        <div className="settings__avatar">
          <Avatar user={{ ...me, displayName: displayName || undefined, avatarUrl: avatarUrl || undefined }} size={96} />
          <div>
            <button type="button" className="button button--ghost" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
              <UploadIcon size={16} /> {upload.isPending ? 'Загружаем…' : 'Загрузить аватар'}
            </button>
            {avatarUrl && (
              <button type="button" className="link-button" onClick={() => setAvatarUrl('')}>
                Убрать
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])}
            />
          </div>
        </div>
        <Field label="Имя" error={errors.displayName}>
          <input className="input" value={displayName} maxLength={80} placeholder={me.username} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="О себе" error={errors.bio} hint={`${bio.length}/500`}>
          <textarea className="input" rows={4} value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <Field label="Username">
          <input className="input" value={`@${me.username}`} disabled />
        </Field>
        {save.error && !Object.keys(errors).length && <p className="form__error">{save.error.message}</p>}
        <div className="form__actions">
          <button type="submit" className="button button--chili" disabled={save.isPending}>
            {save.isPending ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </div>
  );
}
