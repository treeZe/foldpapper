import { api } from './client';
import type {
  AdminPin,
  AdminReport,
  AdminStats,
  AdminUser,
  AuthResponse,
  Board,
  BoardInput,
  FeedSort,
  Page,
  PepperResponse,
  Pin,
  PinInput,
  ReportReason,
  ReportStatus,
  Role,
  StoredImage,
  TagUsage,
  User,
} from './types';

const PAGE_SIZE = 24;

export const authApi = {
  login: (login: string, password: string) =>
    api<AuthResponse>('/auth/login', { method: 'POST', body: { login, password } }),
  register: (body: { username: string; email: string; password: string; displayName?: string }) =>
    api<AuthResponse>('/auth/register', { method: 'POST', body }),
};

export const usersApi = {
  me: () => api<User>('/users/me'),
  updateMe: (body: { displayName?: string; bio?: string; avatarUrl?: string; location?: string; website?: string }) =>
    api<User>('/users/me', { method: 'PATCH', body }),
  profile: (username: string) => api<User>(`/users/${encodeURIComponent(username)}`),
  pins: (username: string, page: number) =>
    api<Page<Pin>>(`/users/${encodeURIComponent(username)}/pins`, { query: { page, size: PAGE_SIZE } }),
  peppered: (username: string, page: number) =>
    api<Page<Pin>>(`/users/${encodeURIComponent(username)}/peppered`, { query: { page, size: PAGE_SIZE } }),
  boards: (username: string) => api<Board[]>(`/users/${encodeURIComponent(username)}/boards`),
  follow: (username: string) => api<void>(`/users/${encodeURIComponent(username)}/follow`, { method: 'PUT' }),
  unfollow: (username: string) =>
    api<void>(`/users/${encodeURIComponent(username)}/follow`, { method: 'DELETE' }),
};

export interface ExploreParams {
  q?: string;
  tag?: string;
  sort?: FeedSort;
}

export const pinsApi = {
  explore: ({ q, tag, sort }: ExploreParams, page: number) =>
    api<Page<Pin>>('/pins', { query: { q, tag, sort, page, size: PAGE_SIZE } }),
  feed: (sort: FeedSort, page: number) => api<Page<Pin>>('/feed', { query: { sort, page, size: PAGE_SIZE } }),
  get: (id: string) => api<Pin>(`/pins/${id}`),
  create: (body: PinInput) => api<Pin>('/pins', { method: 'POST', body }),
  update: (id: string, body: Omit<Partial<PinInput>, 'imageUrl'>) =>
    api<Pin>(`/pins/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => api<void>(`/pins/${id}`, { method: 'DELETE' }),
  setPepper: (id: string, heat: number) =>
    api<PepperResponse>(`/pins/${id}/pepper`, { method: 'PUT', body: { heat } }),
  removePepper: (id: string) => api<PepperResponse>(`/pins/${id}/pepper`, { method: 'DELETE' }),
};

export const boardsApi = {
  get: (id: string) => api<Board>(`/boards/${id}`),
  pins: (id: string, page: number) => api<Page<Pin>>(`/boards/${id}/pins`, { query: { page, size: PAGE_SIZE } }),
  create: (body: BoardInput) => api<Board>('/boards', { method: 'POST', body }),
  update: (id: string, body: BoardInput) => api<Board>(`/boards/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => api<void>(`/boards/${id}`, { method: 'DELETE' }),
  savePin: (boardId: string, pinId: string) =>
    api<void>(`/boards/${boardId}/pins/${pinId}`, { method: 'PUT' }),
  removePin: (boardId: string, pinId: string) =>
    api<void>(`/boards/${boardId}/pins/${pinId}`, { method: 'DELETE' }),
};

export const tagsApi = {
  popular: (limit = 16, q?: string) => api<TagUsage[]>('/tags', { query: { limit, q } }),
};

export const mediaApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<StoredImage>('/media/images', { method: 'POST', body: form });
  },
};

export type ReportTarget = { kind: 'PIN'; pinId: string } | { kind: 'USER'; username: string };

export const reportsApi = {
  create: (target: ReportTarget, reason: ReportReason, comment?: string) =>
    api<void>(
      target.kind === 'PIN' ? `/pins/${target.pinId}/reports` : `/users/${encodeURIComponent(target.username)}/reports`,
      { method: 'POST', body: { reason, comment } },
    ),
};

export const adminApi = {
  stats: () => api<AdminStats>('/admin/stats', { query: { tz: Intl.DateTimeFormat().resolvedOptions().timeZone } }),
  users: (params: { q?: string; filter?: string }, page: number) =>
    api<Page<AdminUser>>('/admin/users', { query: { ...params, page, size: 20 } }),
  updateUser: (id: string, body: { role?: Role; banned?: boolean; banReason?: string }) =>
    api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body }),
  pins: (q: string | undefined, page: number) => api<Page<AdminPin>>('/admin/pins', { query: { q, page, size: 24 } }),
  deletePin: (id: string) => api<void>(`/admin/pins/${id}`, { method: 'DELETE' }),
  reports: (status: ReportStatus, page: number) =>
    api<Page<AdminReport>>('/admin/reports', { query: { status, page, size: 20 } }),
  resolve: (id: string, action: 'DELETE_PIN' | 'DISMISS') =>
    api<void>(`/admin/reports/${id}/resolve`, { method: 'POST', body: { action } }),
};
