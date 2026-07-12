/** Minimal API client for the wedding platform backend (same-origin /api). */

export interface SessionUser {
  id: number;
  name: string;
  role: 'admin' | 'guard' | 'moderator';
}

export interface PublicEvent {
  name: string;
  slug: string;
  coupleNames: string;
  dateTime: string;
  venueName: string;
  venueMapUrl: string | null;
  language: string;
  status: 'draft' | 'live' | 'archived';
  welcomeMessage: string | null;
  thankYouMessage: string | null;
  guestbookPublic: boolean;
  tablesEnabled: boolean;
  invitationConfig: unknown;
}

export interface InviteDetails {
  event: PublicEvent;
  invitation: {
    guestName: string;
    allowedCount: number;
    rsvpStatus: 'pending' | 'confirmed' | 'declined';
    rsvpCount: number | null;
    tableName: string | null;
  };
}

export interface ResolveResult {
  status: 'valid' | 'invalid' | 'cancelled' | 'full';
  token?: string;
  invitationId?: number;
  guestName?: string;
  allowedCount?: number;
  rsvpStatus?: string;
  rsvpCount?: number | null;
  checkedIn?: number;
  remaining?: number;
  tableName?: string | null;
}

const SESSION_KEY = 'wedding.session';
const USER_KEY = 'wedding.user';

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser): void {
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getSessionToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/** Build the absolute URL guests will open, for QR/WhatsApp sharing. */
export function publicUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
