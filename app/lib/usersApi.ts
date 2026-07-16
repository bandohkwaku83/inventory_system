import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface ApiUserRole {
  _id: string;
  name: string;
  slug: string | null;
  entitlements: string[];
}

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  roleId: string;
  staffId: string | null;
  role?: ApiUserRole | null;
  entitlements: string[];
  categoryIds: string[];
  active: boolean;
}

export interface SystemUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  roleName: string;
  staffId: string | null;
  categoryIds: string[];
  active: boolean;
}

export interface CreateUserBody {
  staffId: string;
  email: string;
  password: string;
  roleId: string;
  categoryIds: string[];
  active: boolean;
}

export interface UpdateUserBody {
  staffId?: string;
  email?: string;
  password?: string;
  roleId?: string;
  categoryIds?: string[];
  active?: boolean;
}

export function userResourceUrl(id: string): string {
  return apiUrl(`/api/users/${encodeURIComponent(id)}`);
}

export function mapApiUser(u: ApiUser): SystemUserRow {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role?.slug ?? u.roleId,
    roleId: u.roleId,
    roleName: u.role?.name?.trim() || '',
    staffId: u.staffId ? String(u.staffId) : null,
    categoryIds: Array.isArray(u.categoryIds) ? u.categoryIds.map(String) : [],
    active: Boolean(u.active),
  };
}

export async function fetchUsers(): Promise<SystemUserRow[]> {
  const res = await fetch(apiUrl('/api/users'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error('Invalid users response');
  return (data as ApiUser[]).map(mapApiUser);
}

export async function fetchUser(id: string): Promise<SystemUserRow> {
  const res = await fetch(userResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiUser;
  return mapApiUser(data);
}

export async function createUser(body: CreateUserBody): Promise<SystemUserRow> {
  const res = await fetch(apiUrl('/api/users'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiUser;
  return mapApiUser(data);
}

export async function updateUserApi(id: string, body: UpdateUserBody): Promise<SystemUserRow> {
  const res = await fetch(userResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiUser;
  return mapApiUser(data);
}

export async function deleteUserApi(id: string): Promise<void> {
  const res = await fetch(userResourceUrl(id), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}
