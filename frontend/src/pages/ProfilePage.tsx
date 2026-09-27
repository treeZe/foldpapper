import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { BoardCard, BoardFormModal } from '../components/BoardCard';
import { FollowButton, profileQuery } from '../components/FollowButton';
import { PlusIcon } from '../components/Icons';
import { PinGrid } from '../components/PinGrid';
import { Tabs } from '../components/Tabs';
import { Avatar, EmptyState, ErrorState, Spinner } from '../components/ui';
import { displayName, formatCount, formatDate, plural } from '../lib/format';

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
        <p className="muted">
          @{person.username} · с нами с {formatDate(person.createdAt)}
        </p>
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
        </dl>
        <div className="profile-head__actions">
          {isSelf ? (
            <Link to="/settings" className="button button--ghost">
              Редактировать профиль
            </Link>
          ) : (
            <FollowButton username={person.username} />
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
