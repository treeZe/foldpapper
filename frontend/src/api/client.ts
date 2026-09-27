import type { ApiErrorBody } from './types';

const TOKEN_KEY = 'fp-token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Вызывается при 401 на запросе с токеном — токен протух, отозван или аккаунт заблокирован. */
let onUnauthorized: (message?: string) => void = () => {};
export function setUnauthorizedHandler(handler: (message?: string) => void) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | undefined | null>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Query;
}

function buildUrl(path: string, query?: Query) {
  const url = new URL(`/api/v1${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

export async function api<T>(path: string, { method = 'GET', body, query }: RequestOptions = {}): Promise<T> {
  const token = tokenStore.get();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Проверьте, что бэкенд запущен.');
  }

  if (!response.ok) {
    let data: Partial<ApiErrorBody> = {};
    try {
      data = await response.json();
    } catch {
      // тело не JSON — например, прокси вернул HTML
    }
    if (response.status === 401 && token) {
      onUnauthorized(data.message);
    }
    throw new ApiError(response.status, data.message ?? `Ошибка ${response.status}`, data.fieldErrors ?? {});
  }

  // 204 или 201 без тела (например, жалоба) — возвращаем undefined, а не падаем на JSON.parse
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
