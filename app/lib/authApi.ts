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
}

export async function loginApi(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUserResponse }> {
  const res = await fetch(apiUrl('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { token?: string; user?: AuthUserResponse };
  if (!data.token) throw new Error('Login response missing token');
  if (!data.user) throw new Error('Login response missing user');
  setStoredToken(data.token);
  return { token: data.token, user: data.user };
}

export async function fetchMe(): Promise<AuthUserResponse> {
  const res = await fetch(apiUrl('/api/auth/me'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { user?: AuthUserResponse };
  if (!data.user) throw new Error('Invalid session response');
  return data.user;
}
