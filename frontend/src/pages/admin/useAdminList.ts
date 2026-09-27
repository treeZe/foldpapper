import { useMemo } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import type { Page } from '../../api/types';

/** Постраничный список админки с кнопкой «Показать ещё». Ключи начинаются с 'admin'. */
export function useAdminList<T>(queryKey: QueryKey, fetchPage: (page: number) => Promise<Page<T>>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    // при смене фильтра держим старый список, пока грузится новый — без мигания
    placeholderData: (previous) => previous,
  });
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.totalItems ?? 0;
  return { query, items, total };
}
