import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';
import type { Permission, PermissionGroup, RoleDefinition } from './permissions';

export interface ApiEntitlementItem {
  key: string;
  label: string;
  description?: string;
}

export interface ApiEntitlementGroup {
  group: string;
  items: ApiEntitlementItem[];
}

export interface ApiRole {
  _id: string;
  slug?: string;
  name: string;
  description?: string;
  entitlements: string[];
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function roleResourceUrl(id: string): string {
  return apiUrl(`/api/roles/${encodeURIComponent(id)}`);
}

function formatGroupLabel(group: string): string {
  return group
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function mapEntitlementGroups(data: { groups: ApiEntitlementGroup[] }): PermissionGroup[] {
  return data.groups.map((g) => ({
    label: formatGroupLabel(g.group),
    permissions: g.items.map((item) => ({
      key: item.key as Permission,
      label: item.label,
      description: item.description,
    })),
  }));
}

export function mapApiRole(role: ApiRole): RoleDefinition {
  return {
    id: role.slug ?? role._id,
    apiId: role._id,
    slug: role.slug,
    name: role.name,
    description: role.description ?? '',
    permissions: role.entitlements as Permission[],
    isSystem: Boolean(role.isSystem),
  };
}

export async function fetchRoles(): Promise<RoleDefinition[]> {
  const res = await fetch(apiUrl('/api/roles'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error('Invalid roles response');
  return (data as ApiRole[]).map(mapApiRole);
}

export async function fetchRole(id: string): Promise<RoleDefinition> {
  const res = await fetch(roleResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiRole;
  return mapApiRole(data);
}

export async function fetchEntitlementGroups(): Promise<PermissionGroup[]> {
  const res = await fetch(apiUrl('/api/roles/entitlements'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { groups?: ApiEntitlementGroup[] };
  if (!Array.isArray(data.groups)) throw new Error('Invalid entitlements response');
  return mapEntitlementGroups({ groups: data.groups });
}

export async function createRole(input: {
  name: string;
  description: string;
  entitlements: Permission[];
}): Promise<RoleDefinition> {
  const res = await fetch(apiUrl('/api/roles'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      entitlements: input.entitlements,
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiRole;
  return mapApiRole(data);
}

export async function updateRoleApi(
  apiId: string,
  updates: {
    name?: string;
    description?: string;
    entitlements?: Permission[];
  }
): Promise<RoleDefinition> {
  const body: Record<string, unknown> = {};
  if (updates.name !== undefined) body.name = updates.name;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.entitlements !== undefined) body.entitlements = updates.entitlements;

  const res = await fetch(roleResourceUrl(apiId), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiRole;
  return mapApiRole(data);
}

export async function deleteRoleApi(apiId: string): Promise<void> {
  const res = await fetch(roleResourceUrl(apiId), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export function resolveRoleApiId(role: RoleDefinition): string {
  return role.apiId ?? role.id;
}
