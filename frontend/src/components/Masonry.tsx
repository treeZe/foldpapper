import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface Props<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Отношение высоты к ширине — бэкенд отдаёт размеры картинок заранее. */
  getRatio: (item: T) => number;
  render: (item: T) => ReactNode;
  minColumnWidth?: number;
  gap?: number;
}

/**
 * Masonry-сетка: каждый следующий элемент идёт в самую короткую колонку.
 * В отличие от CSS columns, порядок сохраняется слева направо, как в Pinterest.
 */
export function Masonry<T>({ items, getKey, getRatio, render, minColumnWidth = 236, gap = 18 }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const count = Math.max(2, Math.floor((width + gap) / (minColumnWidth + gap)));

  const columns = useMemo(() => {
    const result: T[][] = Array.from({ length: count }, () => []);
    const heights = new Array<number>(count).fill(0);
    for (const item of items) {
      let target = 0;
      for (let i = 1; i < count; i++) if (heights[i] < heights[target]) target = i;
      result[target].push(item);
      // +0.28 — примерная высота подписи под картинкой в долях ширины
      heights[target] += getRatio(item) + 0.28;
    }
    return result;
  }, [items, count, getRatio]);

  return (
    <div ref={ref} className="masonry" style={{ gap, gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
      {width > 0 &&
        columns.map((column, index) => (
          <div key={index} className="masonry__column" style={{ gap }}>
            {column.map((item) => (
              <div key={getKey(item)}>{render(item)}</div>
            ))}
          </div>
        ))}
    </div>
  );
}
