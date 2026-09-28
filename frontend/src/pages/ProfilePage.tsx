import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints';
import type { User } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { BanModal, useUpdateUser } from '../components/BanModal';
import { BoardCard, BoardFormModal } from '../components/BoardCard';
import { FollowButton, profileQuery } from '../components/FollowButton';
import { FlagIcon, LinkIcon, PlusIcon, ShieldIcon } from '../components/Icons';
import { PinGrid } from '../components/PinGrid';
import { ReportModal } from '../components/ReportModal';
import { Tabs } from '../components/Tabs';
import { Avatar, EmptyState, ErrorState, Spinner } from '../components/ui';
import { displayName, formatCount, formatDate, hostOf, plural } from '../lib/format';

type Tab = 'pins' | 'boards' | 'peppered';

function Boards({ username, isSelf }: { username: string; isSelf: boolean }) {
  const [creating, setCreating] = useState(false);
  const boards = useQuery({ queryKey: ['boards', username], queryFn: () => usersApi.boards(username) });

  if (boards.isPending) return <Spinner />;
  if (boards.isError) return <ErrorState error={boards.error} onRetry={() => boards.refetch()} />;

  return (
    <>
      <div className="board-grid">
        {isSelf && (
          <button type="button" className="board-card board-card--new" onClick={() => setCreating(true)}>
            <span className="board-card__plus">
              <PlusIcon size={34} />
            </span>
            <strong>Новая доска</strong>
          </button>
        )}
        {boards.data.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
      </div>
      {!isSelf && boards.data.length === 0 && <EmptyState title="Досок пока нет" />}
      {creating && <BoardFormModal onClose={() => setCreating(false)} />}
    </>
  );
}

/** Кнопки для чужого профиля: жалоба для всех, блокировка — для админа. */
function ProfileModeration({ person }: { person: User }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const update = useUpdateUser();
  const [dialog, setDialog] = useState<'report' | 'ban' | null>(null);

  if (user?.role === 'ADMIN') {
    // админа сначала разжалуют в админке — бэкенд не даст его заблокировать
    if (person.role === 'ADMIN') return null;
    return (
      <>
        {person.bannedAt ? (
          <button
            type="button"
            className="button button--ghost"
            disabled={update.isPending}
            onClick={() => update.mutate({ user: person, body: { banned: false } })}
          >
            Разблокировать
          </button>
        ) : (
          <button type="button" className="button button--ghost button--danger" onClick={() => setDialog('ban')}>
            Заблокировать
          </button>
        )}
        {dialog === 'ban' && <BanModal user={person} onClose={() => setDialog(null)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="icon-button"
        title="Пожаловаться"
        aria-label="Пожаловаться на профиль"
        onClick={() => (user ? setDialog('report') : navigate('/login', { state: { from: `/u/${person.username}` } }))}
      >
        <FlagIcon />
      </button>
      {dialog === 'report' && (
        <ReportModal target={{ kind: 'USER', username: person.username }} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

export function ProfilePage() {
  const { username = '' } = useParams();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = (['pins', 'boards', 'peppered'].includes(params.get('tab') ?? '') ? params.get('tab') : 'pins') as Tab;
  const profile = useQuery(profileQuery(username));

  if (profile.isPending) return <Spinner />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

  const person = profile.data;
  const isSelf = user?.id === person.id;
  const stats = person.stats;

  return (
    <div className="page">
      <section className="profile-head">
        <div className="profile-head__avatar">
          <Avatar user={person} size={112} />
        </div>
        <h1>{displayName(person)}</h1>
        {person.role === 'ADMIN' && (
          <span className="badge badge--admin">
            <ShieldIcon size={14} /> Модератор
          </span>
        )}
        {person.bannedAt && (
          <span className="badge badge--danger" title={person.banReason}>
            Заблокирован {formatDate(person.bannedAt)}
            {person.banReason && <> · {person.banReason}</>}
          </span>
        )}
        <p className="profile-head__meta muted">
          <span>@{person.username}</span>
          {person.location && <span>{person.location}</span>}
          <span>с нами с {formatDate(person.createdAt)}</span>
        </p>
        {person.website && (
          <a className="profile-head__site" href={person.website} target="_blank" rel="noopener noreferrer nofollow ugc">
            <LinkIcon size={16} /> {hostOf(person.website) ?? person.website}
          </a>
        )}
        {person.bio && <p className="profile-head__bio">{person.bio}</p>}
        <dl className="profile-head__stats">
          <div>
            <dt>{plural(stats.pins, 'пин', 'пина', 'пинов')}</dt>
            <dd>{formatCount(stats.pins)}</dd>
          </div>
          <div>
            <dt>{plural(stats.boards, 'доска', 'доски', 'досок')}</dt>
            <dd>{formatCount(stats.boards)}</dd>
          </div>
          <div>
            <dt>{plural(stats.followers, 'подписчик', 'подписчика', 'подписчиков')}</dt>
            <dd>{formatCount(stats.followers)}</dd>
          </div>
          <div>
            <dt>{plural(stats.following, 'подписка', 'подписки', 'подписок')}</dt>
            <dd>{formatCount(stats.following)}</dd>
          </div>
          <div>
            <dt>{plural(stats.peppers, 'перец получен', 'перца получено', 'перцев получено')}</dt>
            <dd>{formatCount(stats.peppers)}</dd>
          </div>
          <div>
            <dt>{plural(stats.saves, 'сохранение', 'сохранения', 'сохранений')}</dt>
            <dd>{formatCount(stats.saves)}</dd>
          </div>
        </dl>
        {person.topTags.length > 0 && (
          <div className="tag-cloud tag-cloud--wrap profile-head__tags" aria-label="Любимые теги">
            {person.topTags.map((tag) => (
              <Link key={tag} to={`/search?tag=${encodeURIComponent(tag)}`} className="chip">
                #{tag}
              </Link>
            ))}
          </div>
        )}
        <div className="profile-head__actions">
          {isSelf ? (
            <Link to="/settings" className="button button--ghost">
              Редактировать профиль
            </Link>
          ) : (
            <>
              <FollowButton username={person.username} />
              <ProfileModeration person={person} />
            </>
          )}
        </div>
      </section>

      <div className="toolbar toolbar--center">
        <Tabs
          label="Разделы профиля"
          value={tab}
          onChange={(value) => setParams(value === 'pins' ? {} : { tab: value })}
          tabs={[
            { value: 'pins', label: 'Пины' },
            { value: 'boards', label: 'Доски' },
            { value: 'peppered', label: 'Перцы' },
          ]}
        />
      </div>

      {tab === 'boards' && <Boards username={person.username} isSelf={isSelf} />}
      {tab === 'pins' && (
        <PinGrid
          key={`pins-${person.username}`}
          queryKey={['pins', 'user', person.username, 'pins']}
          fetchPage={(page) => usersApi.pins(person.username, page)}
          empty={
            <EmptyState
              title={isSelf ? 'Вы ещё ничего не опубликовали' : 'Пинов пока нет'}
              action={
                isSelf && (
                  <Link to="/create" className="button button--chili">
                    Создать первый пин
                  </Link>
                )
              }
            />
          }
        />
      )}
      {tab === 'peppered' && (
        <PinGrid
          key={`peppered-${person.username}`}
          queryKey={['pins', 'user', person.username, 'peppered']}
          fetchPage={(page) => usersApi.peppered(person.username, page)}
          empty={<EmptyState title="Перцев пока нет" text="Здесь появятся пины, которые зацепили остротой." />}
        />
      )}
    </div>
  );
}
