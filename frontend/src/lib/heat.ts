/** Шкала остроты перца: 1 — «мило», 5 — «огонь». */
export const HEAT_LEVELS = [
  { value: 1, label: 'Мило', color: 'var(--heat-1)' },
  { value: 2, label: 'Пикантно', color: 'var(--heat-2)' },
  { value: 3, label: 'Остро', color: 'var(--heat-3)' },
  { value: 4, label: 'Жжёт', color: 'var(--heat-4)' },
  { value: 5, label: 'Огонь!', color: 'var(--heat-5)' },
] as const;

/** Средняя острота пина, округлённая до уровня 1..5 (0 — перцев нет). */
export function averageHeat(heatScore: number, pepperCount: number) {
  if (pepperCount <= 0) return 0;
  return Math.min(5, Math.max(1, Math.round(heatScore / pepperCount)));
}

export function heatColor(level: number) {
  return level > 0 ? `var(--heat-${level})` : 'var(--ink-3)';
}
