import { apiUrl, readApiError } from './productsApi';

const TOKEN_KEY = 'inventory_system_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export interface AuthUserResponse {
  _id: string;
  name: string;
  email: string;
  roleId: string;
  staffId?: string | null;
  role?: {
    _id: string;
    name: string;
    slug: string | null;
    entitlements: string[];
  } | null;
  entitlements: string[];
  categoryIds: string[];
  active: boolean;
  /** When true, frontend must force a password change before the rest of the app. */
  mustResetPassword?: boolean;
}

export type AuthSessionResponse = { token: string; user: AuthUserResponse };

function parseAuthSession(data: unknown, context: string): AuthSessionResponse {
  const body = data as { token?: string; user?: AuthUserResponse };
  if (!body.token) throw new Error(`${context} response missing token`);
  if (!body.user) throw new Error(`${context} response missing user`);
  return { token: body.token, user: body.user };
}

export async function loginApi(
  email: string,
  password: string
): Promise<AuthSessionResponse> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const session = parseAuthSession(await res.json(), 'Login');
  setStoredToken(session.token);
  return session;
}

export async function fetchMe(): Promise<AuthUserResponse> {
  const res = await fetch(apiUrl('/api/auth/me'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { user?: AuthUserResponse };
  if (!data.user) throw new Error('Invalid session response');
  return data.user;
}

/** Always returns a generic success path on the client — don't branch on existence. */
export async function forgotPasswordApi(email: string): Promise<void> {
  const res = await fetch(apiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function resetPasswordApi(
  token: string,
  password: string
): Promise<AuthSessionResponse> {
  const res = await fetch(apiUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const session = parseAuthSession(await res.json(), 'Reset password');
  setStoredToken(session.token);
  return session;
}

export async function changePasswordApi(
  currentPassword: string,
  newPassword: string
): Promise<AuthSessionResponse> {
  const res = await fetch(apiUrl('/api/auth/change-password'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const session = parseAuthSession(await res.json(), 'Change password');
  setStoredToken(session.token);
  return session;
}
