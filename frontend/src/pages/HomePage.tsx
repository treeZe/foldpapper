import { Link, useSearchParams } from 'react-router';
import { pinsApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { PepperIcon } from '../components/Icons';
import { PinGrid } from '../components/PinGrid';
import { Tabs } from '../components/Tabs';
import { TagCloud } from '../components/TagCloud';
import { EmptyState } from '../components/ui';
import { HEAT_LEVELS } from '../lib/heat';
import { displayName } from '../lib/format';

type Feed = 'following' | 'new' | 'hot';

function Hero() {
  return (
    <section className="hero">
      <div className="hero__text">
        <span className="eyebrow">Визуальные закладки с характером</span>
        <h1>
          Собирайте идеи, <em>которые жгут</em>
        </h1>
        <p>
          Fold Papper — место, где картинки складываются в доски, а вместо лайков ставят перцы. Чем острее идея, тем
          выше она в ленте «Огонь».
        </p>
        <div className="hero__actions">
          <Link to="/register" className="button button--chili button--lg">
            Начать собирать
          </Link>
          <Link to="/explore" className="button button--ghost button--lg">
            Посмотреть идеи
          </Link>
        </div>
      </div>
      <div className="hero__scale" aria-label="Шкала остроты">
        {HEAT_LEVELS.map((level, index) => (
          <div key={level.value} className="hero__level" style={{ animationDelay: `${index * 90}ms` }}>
            <span className="hero__peppers">
              {Array.from({ length: level.value }, (_, i) => (
                <PepperIcon key={i} size={22} color={level.color} />
              ))}
            </span>
            <strong style={{ color: level.color }}>{level.label}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const fallback: Feed = user ? 'following' : 'new';
  const raw = params.get('feed') as Feed | null;
  const feed: Feed = raw === 'hot' || raw === 'new' || (raw === 'following' && user) ? raw : fallback;

  const tabs = [
    ...(user ? [{ value: 'following' as const, label: 'Для вас' }] : []),
    { value: 'new' as const, label: 'Свежее' },
    { value: 'hot' as const, label: 'Огонь 🔥' },
  ];

  return (
    <div className="page">
      {user ? (
        <section className="greeting">
          <h1>
            Привет, <em>{displayName(user)}</em>
          </h1>
          <p className="muted">Что сегодня добавим в копилку острого?</p>
        </section>
      ) : (
        <Hero />
      )}

      <div className="toolbar">
        <Tabs label="Лента" tabs={tabs} value={feed} onChange={(value) => setParams(value === fallback ? {} : { feed: value })} />
        <TagCloud limit={10} />
      </div>

      <PinGrid
        key={feed}
        queryKey={['pins', 'home', feed]}
        fetchPage={(page) => (feed === 'following' ? pinsApi.feed('new', page) : pinsApi.explore({ sort: feed }, page))}
        empty={
          <EmptyState
            title="Лента пока пустая"
            text="Станьте первым, кто принесёт сюда что-то острое."
            action={
              <Link to={user ? '/create' : '/register'} className="button button--chili">
                {user ? 'Создать пин' : 'Присоединиться'}
              </Link>
            }
          />
        }
      />
    </div>
  );
}
