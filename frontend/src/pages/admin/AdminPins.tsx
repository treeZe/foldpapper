import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { dropPinEverywhere } from '../../api/cache';
import type { AdminPin } from '../../api/types';
import { FlagIcon, PepperIcon, SearchIcon, TrashIcon } from '../../components/Icons';
import { useToast } from '../../components/Toast';
import { EmptyState, ErrorState, Spinner } from '../../components/ui';
import { displayName, formatCount, timeAgo } from '../../lib/format';
import { useDebounced } from '../../lib/useDebounced';
import { useAdminList } from './useAdminList';

function AdminPinCard({ pin }: { pin: AdminPin }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const remove = useMutation({
    mutationFn: () => adminApi.deletePin(pin.id),
    onSuccess: () => {
      dropPinEverywhere(queryClient, pin.id);
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast('Пин удалён', 'success');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  return (
    <article className="admin-pin">
      <Link to={`/pin/${pin.id}`} target="_blank" className="admin-pin__thumb">
        <img src={pin.imageUrl} alt="" loading="lazy" />
        {pin.openReports > 0 && (
          <span className="admin-pin__flag" title="Открытые жалобы">
            <FlagIcon size={12} /> {pin.openReports}
          </span>
        )}
      </Link>
      <div className="admin-pin__body">
        <strong>{pin.title ?? 'Без названия'}</strong>
        <Link to={`/u/${pin.author.username}`} className="muted">
          {displayName(pin.author)}
        </Link>
        <span className="admin-pin__stats muted">
          <PepperIcon size={13} color="var(--ink-3)" filled={false} /> {formatCount(pin.heatScore)} · {timeAgo(pin.createdAt)}
        </span>
      </div>
      <button
        type="button"
        className="icon-button icon-button--danger"
        aria-label="Удалить пин"
        title="Удалить пин"
        disabled={remove.isPending}
        onClick={() => confirm(`Удалить пин «${pin.title ?? 'без названия'}»?`) && remove.mutate()}
      >
        <TrashIcon size={18} />
      </button>
    </article>
  );
}

export function AdminPins() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const { query, items, total } = useAdminList(['admin', 'pins', q], (page) => adminApi.pins(q || undefined, page));

  return (
    <div>
      <header className="admin__head">
        <h1>Пины</h1>
        <p className="muted">Все пины, свежие сверху. Флажок — число открытых жалоб.</p>
      </header>
      <div className="toolbar">
        <label className="search search--inline">
          <SearchIcon size={18} />
          <input
            type="search"
            placeholder="Название, описание или тег"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Поиск пинов"
          />
        </label>
        {query.data && <span className="muted">найдено {total}</span>}
      </div>

      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Пинов не нашлось" />
      ) : (
        <div className={`admin-pin-grid${query.isPlaceholderData ? ' is-refetching' : ''}`}>
          {items.map((pin) => (
            <AdminPinCard key={pin.id} pin={pin} />
          ))}
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
