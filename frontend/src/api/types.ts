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
  /** Сколько перцев получили его пины */
  peppers: number;
  /** Сколько раз его пины сохранили на доски */
  saves: number;
}

export type Role = 'USER' | 'ADMIN';

export interface User extends UserSummary {
  bio?: string;
  location?: string;
  website?: string;
  createdAt: string;
  stats: UserStats;
  /** До пяти самых частых тегов в его пинах */
  topTags: string[];
  role: Role;
  /** null/отсутствует для гостя и своего профиля */
  followedByMe?: boolean;
  /** Блокировка — приходит только администраторам */
  bannedAt?: string;
  banReason?: string;
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

// ------------------------------------------------------------------ жалобы

export type ReportReason = 'SPAM' | 'NSFW' | 'OFFENSIVE' | 'COPYRIGHT' | 'IMPERSONATION' | 'OTHER';
export type ReportKind = 'PIN' | 'USER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

// ------------------------------------------------------------------ админка

export interface DayActivity {
  /** ISO-дата YYYY-MM-DD в часовом поясе админа */
  day: string;
  users: number;
  pins: number;
  peppers: number;
}

export interface AdminStats {
  users: number;
  admins: number;
  bannedUsers: number;
  pins: number;
  boards: number;
  peppers: number;
  openReports: number;
  newUsersWeek: number;
  newPinsWeek: number;
  activity: DayActivity[];
}

export interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  bannedAt?: string;
  banReason?: string;
  pins: number;
  /** Открытые жалобы на профиль */
  openReports: number;
  createdAt: string;
}

export interface AdminPin {
  id: string;
  title?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  author: UserSummary;
  pepperCount: number;
  heatScore: number;
  saveCount: number;
  openReports: number;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  kind: ReportKind;
  reason: ReportReason;
  comment?: string;
  status: ReportStatus;
  /** для kind = PIN; нет, если пин уже удалён */
  pin?: AdminPin;
  pinTitle?: string;
  pinImageUrl?: string;
  /** для kind = USER; нет, если аккаунт удалён */
  targetUser?: AdminUser;
  targetUsername?: string;
  reporter: UserSummary;
  resolvedBy?: UserSummary;
  resolvedAt?: string;
  createdAt: string;
}
