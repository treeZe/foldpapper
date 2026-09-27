// Типы ответов бэкенда — зеркало DTO из backend/src/main/java/com/foldpapper/**/dto

export interface UserSummary {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface UserStats {
  pins: number;
  boards: number;
  followers: number;
  following: number;
}

export interface User extends UserSummary {
  bio?: string;
  createdAt: string;
  stats: UserStats;
  /** null/отсутствует для гостя и своего профиля */
  followedByMe?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface Pin {
  id: string;
  title?: string;
  description?: string;
  sourceUrl?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  tags: string[];
  author: UserSummary;
  pepperCount: number;
  heatScore: number;
  saveCount: number;
  /** Острота моего перца 1..5, если он есть */
  myPepper?: number;
  createdAt: string;
}

export interface Board {
  id: string;
  title: string;
  slug: string;
  description?: string;
  isPrivate: boolean;
  pinCount: number;
  coverImageUrl?: string;
  owner: UserSummary;
  createdAt: string;
}

export interface PepperResponse {
  pinId: string;
  myPepper?: number;
  pepperCount: number;
  heatScore: number;
}

export interface TagUsage {
  name: string;
  pinCount: number;
}

export interface StoredImage {
  url: string;
  width?: number;
  height?: number;
  sizeBytes: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ApiErrorBody {
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: Record<string, string>;
}

export type FeedSort = 'new' | 'hot';

export interface PinInput {
  title?: string;
  description?: string;
  sourceUrl?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  tags?: string[];
  boardId?: string;
}

export interface BoardInput {
  title?: string;
  description?: string;
  isPrivate?: boolean;
  coverPinId?: string;
}
