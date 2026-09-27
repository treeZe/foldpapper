import { Link, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import type { AdminReport, ReportStatus } from '../../api/types';
import { reasonLabel } from '../../components/ReportModal';
import { Tabs } from '../../components/Tabs';
import { useToast } from '../../components/Toast';
import { Avatar, EmptyState, ErrorState, Spinner } from '../../components/ui';
import { displayName, formatDate, plural, timeAgo } from '../../lib/format';
import { useAdminList } from './useAdminList';

const STATUS_TABS = [
  { value: 'OPEN' as const, label: 'Открытые' },
  { value: 'RESOLVED' as const, label: 'Пин удалён' },
  { value: 'DISMISSED' as const, label: 'Отклонённые' },
];

function ReportCard({ report }: { report: AdminReport }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const pin = report.pin;

  const resolve = useMutation({
    mutationFn: (action: 'DELETE_PIN' | 'DISMISS') => adminApi.resolve(report.id, action),
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      // пин мог пропасть из лент
      if (action === 'DELETE_PIN') queryClient.invalidateQueries({ queryKey: ['pins'] });
      toast(action === 'DELETE_PIN' ? 'Пин удалён, жалобы на него закрыты' : 'Жалоба отклонена', 'success');
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const title = pin?.title ?? report.pinTitle ?? 'Без названия';
  const others = pin ? pin.openReports - (report.status === 'OPEN' ? 1 : 0) : 0;

  return (
    <article className="report-card">
      <div className="report-card__thumb">
        <img src={pin?.imageUrl ?? report.pinImageUrl} alt="" loading="lazy" />
        {!pin && <span className="report-card__gone">удалён</span>}
      </div>
      <div className="report-card__body">
        <div className="report-card__top">
          <span className="chip chip--static">{reasonLabel(report.reason)}</span>
          <span className="muted">{timeAgo(report.createdAt)}</span>
          {others > 0 && (
            <span className="badge badge--warn">
              ещё {others} {plural(others, 'жалоба', 'жалобы', 'жалоб')}
            </span>
          )}
        </div>
        <h3>{pin ? <Link to={`/pin/${pin.id}`} target="_blank">{title}</Link> : title}</h3>
        {pin && (
          <p className="muted">
            Автор: <Link to={`/u/${pin.author.username}`}>{displayName(pin.author)}</Link>
          </p>
        )}
        {report.comment && <blockquote className="report-card__comment">«{report.comment}»</blockquote>}
        <p className="report-card__meta">
          <Avatar user={report.reporter} size={20} /> Жалоба от{' '}
          <Link to={`/u/${report.reporter.username}`}>{displayName(report.reporter)}</Link>
        </p>
        {report.status !== 'OPEN' && report.resolvedAt && (
          <p className="report-card__meta muted">
            {report.status === 'RESOLVED' ? 'Пин удалён' : 'Отклонено'} {formatDate(report.resolvedAt)}
            {report.resolvedBy && <> · {displayName(report.resolvedBy)}</>}
          </p>
        )}
      </div>
      {report.status === 'OPEN' && (
        <div className="report-card__actions">
          {pin ? (
            <button
              type="button"
              className="button button--danger-solid button--sm"
              disabled={resolve.isPending}
              onClick={() => confirm(`Удалить пин «${title}»? Это действие нельзя отменить.`) && resolve.mutate('DELETE_PIN')}
            >
              Удалить пин
            </button>
          ) : (
            <button type="button" className="button button--sm" disabled={resolve.isPending} onClick={() => resolve.mutate('DELETE_PIN')}>
              Закрыть
            </button>
          )}
          <button type="button" className="button button--ghost button--sm" disabled={resolve.isPending} onClick={() => resolve.mutate('DISMISS')}>
            Отклонить
          </button>
        </div>
      )}
    </article>
  );
}

export function AdminReports() {
  const [params, setParams] = useSearchParams();
  const status = (STATUS_TABS.find((t) => t.value === params.get('status'))?.value ?? 'OPEN') as ReportStatus;
  const { query, items, total } = useAdminList(['admin', 'reports', status], (page) => adminApi.reports(status, page));

  return (
    <div>
      <header className="admin__head">
        <h1>Жалобы</h1>
        <p className="muted">Открытые жалобы идут от старых к новым — разбирайте сверху вниз.</p>
      </header>
      <div className="toolbar">
        <Tabs label="Статус жалоб" tabs={STATUS_TABS} value={status} onChange={(v) => setParams(v === 'OPEN' ? {} : { status: v })} />
        {query.data && <span className="muted">всего {total}</span>}
      </div>

      {query.isPending ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title={status === 'OPEN' ? 'Жалоб нет — всё спокойно' : 'Здесь пока пусто'} />
      ) : (
        <div className={`report-list${query.isPlaceholderData ? ' is-refetching' : ''}`}>
          {items.map((report) => (
            <ReportCard key={report.id} report={report} />
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
