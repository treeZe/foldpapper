import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { Page, Pin } from '../api/types';
import { Masonry } from './Masonry';
import { PinCard, pinRatio } from './PinCard';
import { EmptyState, ErrorState, Spinner } from './ui';

interface Props {
  /** Ключ обязательно начинается с 'pins' — см. patchPinEverywhere. */
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<Page<Pin>>;
  empty?: ReactNode;
  renderAction?: (pin: Pin) => ReactNode;
  enabled?: boolean;
}

/** Лента пинов с бесконечной подгрузкой. */
export function PinGrid({ queryKey, fetchPage, empty, renderAction, enabled = true }: Props) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    enabled,
  });

  const pins = useMemo(() => {
    // между страницами пин может «переехать» при сортировке по остроте — убираем дубли
    const seen = new Set<string>();
    return (query.data?.pages ?? []).flatMap((page) => page.items).filter((pin) => !seen.has(pin.id) && seen.add(pin.id));
  }, [query.data]);

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '800px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (query.isPending && enabled) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (pins.length === 0) return <>{empty ?? <EmptyState title="Здесь пока пусто" text="Загляните попозже — перцы ещё зреют." />}</>;

  return (
    <>
      <Masonry
        items={pins}
        getKey={(pin) => pin.id}
        getRatio={pinRatio}
        render={(pin) => <PinCard pin={pin} extraAction={renderAction?.(pin)} />}
      />
      <div ref={sentinel} className="grid-sentinel">
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && pins.length > 12 && <span className="muted">Вы долистали до дна тарелки 🌶️</span>}
      </div>
    </>
  );
}
