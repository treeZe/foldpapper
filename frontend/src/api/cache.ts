import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Page, Pin } from './types';

/**
 * Обновляет пин во всех закэшированных лентах и на странице пина,
 * чтобы перец/счётчики менялись везде сразу, без перезагрузки.
 */
export function patchPinEverywhere(client: QueryClient, pinId: string, patch: Partial<Pin>) {
  client.setQueriesData<InfiniteData<Page<Pin>>>({ queryKey: ['pins'] }, (data) => {
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((pin) => (pin.id === pinId ? { ...pin, ...patch } : pin)),
      })),
    };
  });
  client.setQueryData<Pin>(['pin', pinId], (pin) => (pin ? { ...pin, ...patch } : pin));
}

/** Убирает пин из всех закэшированных лент (после удаления). */
export function dropPinEverywhere(client: QueryClient, pinId: string) {
  client.setQueriesData<InfiniteData<Page<Pin>>>({ queryKey: ['pins'] }, (data) => {
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({ ...page, items: page.items.filter((pin) => pin.id !== pinId) })),
    };
  });
  client.removeQueries({ queryKey: ['pin', pinId] });
}
