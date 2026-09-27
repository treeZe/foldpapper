import { useSearchParams } from 'react-router';
import { pinsApi } from '../api/endpoints';
import type { FeedSort } from '../api/types';
import { PinGrid } from '../components/PinGrid';
import { Tabs } from '../components/Tabs';
import { TagCloud } from '../components/TagCloud';
import { EmptyState } from '../components/ui';

const SORT_TABS = [
  { value: 'new' as const, label: 'Свежее' },
  { value: 'hot' as const, label: 'Огонь 🔥' },
];

/** Обзор (/explore) и поиск (/search?q= или ?tag=) — одна страница с разными заголовками. */
export function SearchPage({ explore = false }: { explore?: boolean }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() || undefined;
  const tag = params.get('tag')?.trim().toLowerCase() || undefined;
  const sort: FeedSort = params.get('sort') === 'hot' ? 'hot' : 'new';

  const setSort = (value: FeedSort) => {
    const next = new URLSearchParams(params);
    if (value === 'new') next.delete('sort');
    else next.set('sort', value);
    setParams(next);
  };

  const title = explore ? 'Обзор' : tag ? `#${tag}` : q ? `«${q}»` : 'Поиск';
  const subtitle = explore
    ? 'Всё, что сейчас лежит на столе: свежее и самое острое.'
    : tag
      ? 'Пины с этим тегом'
      : 'Ищем по названию и описанию пинов';

  return (
    <div className="page">
      <section className="page-head">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </section>
      <div className="toolbar">
        <Tabs label="Сортировка" tabs={SORT_TABS} value={sort} onChange={setSort} />
      </div>
      <TagCloud active={tag} limit={explore ? 24 : 12} />
      <PinGrid
        key={`${q}|${tag}|${sort}`}
        queryKey={['pins', 'explore', { q, tag, sort }]}
        fetchPage={(page) => pinsApi.explore({ q, tag, sort }, page)}
        empty={<EmptyState title="Ничего не нашлось" text="Попробуйте другое слово или загляните в популярные теги." />}
      />
    </div>
  );
}
