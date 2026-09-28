import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/endpoints';
import type { Role } from '../api/types';
import { useToast } from './Toast';
import { Modal } from './ui';

type Target = { id: string; username: string };

// короткая подпись на чипе, полный текст — в причину: его увидит пользователь при входе
const QUICK_REASONS = [
  { label: 'Спам', reason: 'Спам' },
  { label: 'Оскорбления', reason: 'Оскорбления' },
  { label: '18+', reason: 'Контент 18+' },
  { label: 'Фейк', reason: 'Фейковый аккаунт' },
];

/** Роль и блокировка из админки и со страницы профиля. */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ user, body }: { user: Target; body: { role?: Role; banned?: boolean; banReason?: string } }) =>
      adminApi.updateUser(user.id, body),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['user', updated.username.toLowerCase()] });
      toast(
        updated.bannedAt
          ? `${updated.username} заблокирован`
          : updated.role === 'ADMIN'
            ? `${updated.username} теперь администратор`
            : `Изменения для ${updated.username} сохранены`,
        'success',
      );
    },
    onError: (error) => toast(error.message, 'error'),
  });
}

export function BanModal({ user, onClose }: { user: Target; onClose: () => void }) {
  const update = useUpdateUser();
  const [reason, setReason] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ user, body: { banned: true, banReason: reason.trim() || undefined } }, { onSuccess: onClose });
  };

  return (
    <Modal title={`Заблокировать @${user.username}?`} size="compact" onClose={onClose}>
      <form className="form form--tight" onSubmit={submit}>
        <p className="muted">Сразу выйдет из аккаунта и не сможет войти. Пины останутся — их можно удалить отдельно.</p>
        <div className="tag-cloud tag-cloud--wrap" role="group" aria-label="Быстрый выбор причины">
          {QUICK_REASONS.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`chip${reason === item.reason ? ' chip--active' : ''}`}
              aria-pressed={reason === item.reason}
              title={item.reason}
              onClick={() => setReason(item.reason)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          maxLength={300}
          value={reason}
          autoFocus
          placeholder="Причина — её покажем при входе"
          aria-label="Причина блокировки"
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="form__actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="button button--danger-solid" disabled={update.isPending}>
            Заблокировать
          </button>
        </div>
      </form>
    </Modal>
  );
}
