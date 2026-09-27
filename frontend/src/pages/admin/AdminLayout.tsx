import { NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/endpoints';
import { FlagIcon, ShieldIcon } from '../../components/Icons';

export const adminStatsQuery = { queryKey: ['admin', 'stats'], queryFn: adminApi.stats, staleTime: 15_000 };

const LINKS = [
  { to: '/admin', label: 'Обзор', end: true },
  { to: '/admin/reports', label: 'Жалобы', end: false },
  { to: '/admin/users', label: 'Пользователи', end: false },
  { to: '/admin/pins', label: 'Пины', end: false },
];

export function AdminLayout() {
  const stats = useQuery(adminStatsQuery);
  const open = stats.data?.openReports ?? 0;

  return (
    <div className="page admin">
      <aside className="admin__side">
        <div className="admin__title">
          <ShieldIcon size={22} />
          <div>
            <strong>Админ-панель</strong>
            <small className="muted">модерация Fold Papper</small>
          </div>
        </div>
        <nav className="admin__nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
              {link.to === '/admin/reports' && open > 0 && (
                <span className="admin__count" aria-label={`${open} открытых`}>
                  <FlagIcon size={12} /> {open}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="admin__content">
        <Outlet />
      </section>
    </div>
  );
}
