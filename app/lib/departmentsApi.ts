import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';
import type { Department } from './departments';

export interface ApiDivision {
  _id: string;
  name: string;
}

export interface ApiDepartment {
  _id: string;
  name: string;
  divisions?: ApiDivision[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDepartmentPayload {
  name: string;
  divisions?: string[] | { name: string }[];
}

export interface UpdateDepartmentPayload {
  name?: string;
  divisions?: string[] | { name: string; _id?: string; id?: string }[];
}

export interface FetchDepartmentsParams {
  page?: number;
  limit?: number;
  q?: string;
}

export function departmentResourceUrl(id: string): string {
  return apiUrl(`/api/departments/${encodeURIComponent(id)}`);
}

function mapDivisionName(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (raw && typeof raw === 'object' && 'name' in raw) {
    return String((raw as { name: unknown }).name ?? '').trim();
  }
  return '';
}

/** Flatten nested API departments into the UI adjacency-list model. */
export function mapApiDepartmentToFlat(dept: ApiDepartment): Department[] {
  const parentId = dept._id;
  const parent: Department = {
    id: parentId,
    name: dept.name,
    parentId: null,
  };
  const divisions = (dept.divisions ?? [])
    .map((d) => {
      const name = mapDivisionName(d);
      return {
        id: d._id,
        name,
        parentId,
      };
    })
    .filter((d) => d.name);
  return [parent, ...divisions];
}

export function flattenApiDepartments(list: ApiDepartment[]): Department[] {
  return list.flatMap(mapApiDepartmentToFlat);
}

function extractDepartmentList(raw: unknown): {
  list: ApiDepartment[];
  totalPages: number;
} {
  if (Array.isArray(raw)) {
    return { list: raw as ApiDepartment[], totalPages: 1 };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['items', 'departments', 'data', 'results', 'docs']) {
      const v = o[key];
      if (Array.isArray(v)) {
        const totalPages =
          typeof o.totalPages === 'number' && o.totalPages > 0 ? o.totalPages : 1;
        return { list: v as ApiDepartment[], totalPages };
      }
    }
  }
  return { list: [], totalPages: 1 };
}

function normalizeDivisionsPayload(
  divisions: CreateDepartmentPayload['divisions'] | UpdateDepartmentPayload['divisions']
): string[] | { name: string; _id?: string }[] | undefined {
  if (divisions === undefined) return undefined;
  if (divisions.length === 0) return [];

  const asObjects = divisions.map((d) => {
    if (typeof d === 'string') return { name: d.trim() };
    const name = d.name.trim();
    const id = ('_id' in d && d._id) || ('id' in d && d.id) || undefined;
    return id ? { _id: String(id), name } : { name };
  }).filter((d) => d.name);

  const allStrings = asObjects.every((d) => !('_id' in d));
  if (allStrings) return asObjects.map((d) => d.name);
  return asObjects;
}

/** Fetch all pages of departments (or a filtered page). */
export async function fetchDepartments(
  params: FetchDepartmentsParams = {}
): Promise<Department[]> {
  const all: ApiDepartment[] = [];
  let page = params.page ?? 1;
  const limit = params.limit ?? 100;
  let totalPages = 1;
  const singlePage = params.page !== undefined;

  do {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('limit', String(limit));
    if (params.q?.trim()) query.set('q', params.q.trim());

    const res = await fetch(`${apiUrl('/api/departments')}?${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res));
    const { list, totalPages: pages } = extractDepartmentList(await res.json());
    all.push(...list);
    totalPages = pages;
    page += 1;
  } while (!singlePage && page <= totalPages);

  return flattenApiDepartments(all);
}

export async function fetchDepartment(id: string): Promise<Department[]> {
  const res = await fetch(departmentResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiDepartment | { department?: ApiDepartment };
  const dept =
    data && typeof data === 'object' && 'department' in data && data.department
      ? data.department
      : (data as ApiDepartment);
  if (!dept?._id) throw new Error('Invalid department response');
  return mapApiDepartmentToFlat(dept);
}

export async function createDepartment(
  payload: CreateDepartmentPayload
): Promise<Department[]> {
  const body: Record<string, unknown> = { name: payload.name.trim() };
  const divisions = normalizeDivisionsPayload(payload.divisions);
  if (divisions !== undefined) body.divisions = divisions;

  const res = await fetch(apiUrl('/api/departments'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiDepartment | { department?: ApiDepartment };
  const dept =
    data && typeof data === 'object' && 'department' in data && data.department
      ? data.department
      : (data as ApiDepartment);
  if (dept?._id) return mapApiDepartmentToFlat(dept);
  throw new Error('Invalid create department response');
}

export async function updateDepartmentApi(
  id: string,
  payload: UpdateDepartmentPayload
): Promise<Department[]> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name.trim();
  const divisions = normalizeDivisionsPayload(payload.divisions);
  if (divisions !== undefined) body.divisions = divisions;

  const res = await fetch(departmentResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));

  if (res.status === 204) return fetchDepartment(id);

  const text = await res.text();
  if (!text) return fetchDepartment(id);
  const data = JSON.parse(text) as ApiDepartment | { department?: ApiDepartment };
  const dept =
    data && typeof data === 'object' && 'department' in data && data.department
      ? data.department
      : (data as ApiDepartment);
  if (dept?._id) return mapApiDepartmentToFlat(dept);
  return fetchDepartment(id);
}

export async function deleteDepartmentApi(id: string): Promise<void> {
  const res = await fetch(departmentResourceUrl(id), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

/** Add a single division under a department. Falls back to PATCH list replace if needed. */
export async function addDivision(
  departmentId: string,
  name: string,
  currentDivisionNames: string[]
): Promise<Department[]> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Division name is required');

  const res = await fetch(`${departmentResourceUrl(departmentId)}/divisions`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: trimmed }),
  });

  if (res.ok) {
    const text = await res.text();
    if (!text) return fetchDepartment(departmentId);
    const data = JSON.parse(text) as ApiDepartment | { department?: ApiDepartment };
    const dept =
      data && typeof data === 'object' && 'department' in data && data.department
        ? data.department
        : (data as ApiDepartment);
    if (dept?._id) return mapApiDepartmentToFlat(dept);
    return fetchDepartment(departmentId);
  }

  if (res.status !== 404 && res.status !== 405) {
    throw new Error(await readApiError(res));
  }

  return updateDepartmentApi(departmentId, {
    divisions: [...currentDivisionNames, trimmed],
  });
}

export async function renameDivision(
  departmentId: string,
  divisionId: string,
  name: string,
  divisions: { id: string; name: string }[]
): Promise<Department[]> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Division name is required');

  const res = await fetch(
    `${departmentResourceUrl(departmentId)}/divisions/${encodeURIComponent(divisionId)}`,
    {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: trimmed }),
    }
  );

  if (res.ok) {
    const text = await res.text();
    if (!text) return fetchDepartment(departmentId);
    const data = JSON.parse(text) as ApiDepartment | { department?: ApiDepartment };
    const dept =
      data && typeof data === 'object' && 'department' in data && data.department
        ? data.department
        : (data as ApiDepartment);
    if (dept?._id) return mapApiDepartmentToFlat(dept);
    return fetchDepartment(departmentId);
  }

  if (res.status !== 404 && res.status !== 405) {
    throw new Error(await readApiError(res));
  }

  return updateDepartmentApi(departmentId, {
    divisions: divisions.map((d) =>
      d.id === divisionId ? { _id: d.id, name: trimmed } : { _id: d.id, name: d.name }
    ),
  });
}

export async function removeDivision(
  departmentId: string,
  divisionId: string,
  divisions: { id: string; name: string }[]
): Promise<Department[]> {
  const res = await fetch(
    `${departmentResourceUrl(departmentId)}/divisions/${encodeURIComponent(divisionId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(),
    }
  );

  if (res.ok || res.status === 204) {
    return fetchDepartments();
  }

  if (res.status !== 404 && res.status !== 405) {
    throw new Error(await readApiError(res));
  }

  return updateDepartmentApi(departmentId, {
    divisions: divisions.filter((d) => d.id !== divisionId).map((d) => d.name),
  });
}
