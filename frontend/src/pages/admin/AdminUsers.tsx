import { useState } from 'react';
import { Link } from 'react-router';
import { adminApi } from '../../api/endpoints';
import type { AdminUser } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { BanModal, useUpdateUser } from '../../components/BanModal';
import { FlagIcon, SearchIcon, ShieldIcon } from '../../components/Icons';
import { Tabs } from '../../components/Tabs';
import { Avatar, EmptyState, ErrorState, Spinner } from '../../components/ui';
import { displayName, formatDate, plural } from '../../lib/format';
import { useDebounced } from '../../lib/useDebounced';
import { useAdminList } from './useAdminList';

type Filter = 'all' | 'admins' | 'banned';

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
        {user.openReports > 0 && (
          <Link to="/admin/reports" className="badge badge--warn user-reports">
            <FlagIcon size={12} /> {user.openReports} {plural(user.openReports, 'жалоба', 'жалобы', 'жалоб')}
          </Link>
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
