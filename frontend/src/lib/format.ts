const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

export const formatCount = (value: number) => compact.format(value);

const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export const displayName = (user: { username: string; displayName?: string }) =>
  user.displayName?.trim() || user.username;

/** Хост источника для подписи «из example.com». */
export function hostOf(url?: string) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Разбирает строку «#перец, закуски острое» в список тегов. */
export function parseTags(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((tag) => tag.replace(/^#+/, '').trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}
