import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import type { AdminUser, Role } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { SearchIcon, ShieldIcon } from '../../components/Icons';
import { Tabs } from '../../components/Tabs';
import { useToast } from '../../components/Toast';
import { Avatar, EmptyState, ErrorState, Field, Modal, Spinner } from '../../components/ui';
import { displayName, formatDate } from '../../lib/format';
import { useDebounced } from '../../lib/useDebounced';
import { useAdminList } from './useAdminList';

type Filter = 'all' | 'admins' | 'banned';

function useUpdateUser() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ user, body }: { user: AdminUser; body: { role?: Role; banned?: boolean; banReason?: string } }) =>
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

function BanModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const update = useUpdateUser();
  const [reason, setReason] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ user, body: { banned: true, banReason: reason.trim() || undefined } }, { onSuccess: onClose });
  };

  return (
    <Modal title={`Заблокировать @${user.username}?`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="muted">
          Пользователя сразу разлогинит, войти снова он не сможет. Его пины останутся на сайте — при необходимости удалите их
          отдельно.
        </p>
        <Field label="Причина" hint="Её увидит пользователь при попытке входа">
          <input className="input" maxLength={300} value={reason} autoFocus onChange={(e) => setReason(e.target.value)} />
        </Field>
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

function UserRow({ user, isSelf }: { user: AdminUser; isSelf: boolean }) {
  const update = useUpdateUser();
  const [banning, setBanning] = useState(false);
  const isAdmin = user.role === 'ADMIN';

  return (
    <tr className={user.bannedAt ? 'is-banned' : undefined}>
      <td>
        <Link to={`/u/${user.username}`} className="user-cell">
          <Avatar user={user} size={36} />
          <span>
            <strong>{displayName(user)}</strong>
            <small className="muted">@{user.username}</small>
          </span>
        </Link>
      </td>
      <td className="muted user-email">{user.email}</td>
      <td className="num">{user.pins}</td>
      <td className="muted">{formatDate(user.createdAt)}</td>
      <td>
        {user.bannedAt ? (
          <span className="badge badge--danger" title={user.banReason ?? undefined}>
            Заблокирован
          </span>
        ) : isAdmin ? (
          <span className="badge badge--admin">
            <ShieldIcon size={12} /> Админ
          </span>
        ) : (
          <span className="badge">Активен</span>
        )}
        {user.banReason && <small className="muted user-reason">{user.banReason}</small>}
      </td>
      <td className="row-actions">
        {isSelf ? (
          <span className="muted">это вы</span>
        ) : (
          <>
            {!user.bannedAt && (
              <button
                type="button"
                className="button button--ghost button--sm"
                disabled={update.isPending}
                onClick={() =>
                  (isAdmin || confirm(`Сделать @${user.username} администратором? Он получит доступ к этой панели.`)) &&
                  update.mutate({ user, body: { role: isAdmin ? 'USER' : 'ADMIN' } })
                }
              >
                {isAdmin ? 'Снять админа' : 'Сделать админом'}
              </button>
            )}
            {user.bannedAt ? (
              <button
                type="button"
                className="button button--ghost button--sm"
                disabled={update.isPending}
                onClick={() => update.mutate({ user, body: { banned: false } })}
              >
                Разблокировать
              </button>
            ) : (
              !isAdmin && (
                <button type="button" className="button button--ghost button--sm button--danger" onClick={() => setBanning(true)}>
                  Заблокировать
                </button>
              )
            )}
          </>
        )}
        {banning && <BanModal user={user} onClose={() => setBanning(false)} />}
      </td>
    </tr>
  );
}

export function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const q = useDebounced(search.trim());
  const { query, items, total } = useAdminList(['admin', 'users', q, filter], (page) =>
    adminApi.users({ q: q || undefined, filter: filter === 'all' ? undefined : filter }, page),
  );

  return (
    <div>
      <header className="admin__head">
        <h1>Пользователи</h1>
        <p className="muted">Роли и блокировки применяются сразу — без перезахода пользователя.</p>
      </header>
      <div className="toolbar">
        <label className="search search--inline">
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder="Имя, username или email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Поиск пользователей"
          />
        </label>
        <Tabs
          label="Фильтр"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: 'all', label: 'Все' },
            { value: 'admins', label: 'Админы' },
            { value: 'banned', label: 'Заблокированные' },
          ]}
        />
        {query.data && <span className="muted">найдено {total}</span>}
      </div>

      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Никого не нашли" />
      ) : (
        <div className={`table-wrap${query.isPlaceholderData ? ' is-refetching' : ''}`}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th className="num">Пины</th>
                <th>Регистрация</th>
                <th>Статус</th>
                <th aria-label="Действия" />
              </tr>
            </thead>
            <tbody>
              {items.map((user) => (
                <UserRow key={user.id} user={user} isSelf={user.id === me?.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.hasNextPage && (
        <div className="load-more">
          <button type="button" className="button button--ghost" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
            Показать ещё
          </button>
        </div>
      )}
    </div>
  );
}
