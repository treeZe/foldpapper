import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, Spinner } from '../../components/ui';
import { FlagIcon } from '../../components/Icons';
import { formatCount, plural } from '../../lib/format';
import { ActivityChart } from './ActivityChart';
import { adminStatsQuery } from './AdminLayout';

function StatTile({ label, value, note, action }: { label: string; value: number; note?: ReactNode; action?: ReactNode }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <strong className="stat-tile__value">{formatCount(value)}</strong>
      {note && <span className="stat-tile__note">{note}</span>}
      {action}
    </div>
  );
}

const tableDate = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

export function AdminOverview() {
  const stats = useQuery(adminStatsQuery);
  const [asTable, setAsTable] = useState(false);

  if (stats.isPending) return <Spinner />;
  if (stats.isError) return <ErrorState error={stats.error} onRetry={() => stats.refetch()} />;

  const s = stats.data;
  const series = (key: 'users' | 'pins' | 'peppers') => s.activity.map((d) => ({ day: d.day, value: d[key] }));

  return (
    <div className={stats.isFetching ? 'is-refetching' : undefined}>
      <header className="admin__head">
        <h1>Обзор</h1>
        <p className="muted">Сводка по сервису и активность за последние две недели.</p>
      </header>

      <div className="stat-row">
        <StatTile label="Пользователи" value={s.users} note={`+${formatCount(s.newUsersWeek)} за неделю`} />
        <StatTile label="Пины" value={s.pins} note={`+${formatCount(s.newPinsWeek)} за неделю`} />
        <StatTile label="Перцы" value={s.peppers} />
        <StatTile label="Доски" value={s.boards} />
        <StatTile
          label="Открытые жалобы"
          value={s.openReports}
          note={
            s.openReports > 0 ? (
              <span className="stat-tile__alert">
                <FlagIcon size={14} /> ждут решения
              </span>
            ) : (
              'очередь пуста'
            )
          }
          action={
            s.openReports > 0 && (
              <Link to="/admin/reports" className="stat-tile__link">
                Разобрать →
              </Link>
            )
          }
        />
        <StatTile
          label="Заблокированы"
          value={s.bannedUsers}
          note={`${s.admins} ${plural(s.admins, 'администратор', 'администратора', 'администраторов')}`}
        />
      </div>

      <div className="admin__section-head">
        <h2>Активность</h2>
        <button type="button" className="link-button" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
          {asTable ? 'Показать графики' : 'Показать таблицей'}
        </button>
      </div>

      {asTable ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>День</th>
                <th className="num">Новые пользователи</th>
                <th className="num">Новые пины</th>
                <th className="num">Перцы</th>
              </tr>
            </thead>
            <tbody>
              {[...s.activity].reverse().map((d) => {
                const [y, m, day] = d.day.split('-').map(Number);
                return (
                  <tr key={d.day}>
                    <td>{tableDate.format(new Date(y, m - 1, day))}</td>
                    <td className="num">{d.users}</td>
                    <td className="num">{d.pins}</td>
                    <td className="num">{d.peppers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-grid">
          <ActivityChart title="Новые пины" points={series('pins')} unit={(n) => plural(n, 'пин', 'пина', 'пинов')} />
          <ActivityChart
            title="Новые пользователи"
            points={series('users')}
            unit={(n) => plural(n, 'регистрация', 'регистрации', 'регистраций')}
          />
          <ActivityChart title="Перцы" points={series('peppers')} unit={(n) => plural(n, 'перец', 'перца', 'перцев')} />
        </div>
      )}
    </div>
  );
}
