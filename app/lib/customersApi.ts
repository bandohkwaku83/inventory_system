import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface ApiCustomer {
  _id: string;
  name: string;
  phone?: string;
  city?: string;
  location?: string;
  balance?: number;
  totalPurchases?: number;
  lastPurchaseDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MappedCustomer {
  id: string;
  name: string;
  phone: string;
  city: string;
  balance: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  /** Preferred field; also accept `location` for POS/forms */
  city?: string;
  location?: string;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

export interface FetchCustomersParams {
  page?: number;
  limit?: number;
  q?: string;
}

export function customerResourceUrl(id: string): string {
  return apiUrl(`/api/customers/${encodeURIComponent(id)}`);
}

export function mapApiCustomer(c: ApiCustomer): MappedCustomer {
  return {
    id: c._id,
    name: c.name,
    phone: c.phone ?? '',
    city: c.city ?? c.location ?? '',
    balance: typeof c.balance === 'number' ? c.balance : 0,
    totalPurchases: typeof c.totalPurchases === 'number' ? c.totalPurchases : 0,
    lastPurchaseDate: c.lastPurchaseDate
      ? String(c.lastPurchaseDate).slice(0, 10)
      : '',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function toCreateBody(payload: CreateCustomerPayload): Record<string, unknown> {
  const city = (payload.city ?? payload.location ?? '').trim();
  const body: Record<string, unknown> = {
    name: payload.name.trim(),
    phone: payload.phone.trim(),
  };
  if (city) body.city = city;
  return body;
}

function toPatchBody(payload: UpdateCustomerPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name.trim();
  if (payload.phone !== undefined) body.phone = payload.phone.trim();
  if (payload.city !== undefined || payload.location !== undefined) {
    body.city = (payload.city ?? payload.location ?? '').trim();
  }
  return body;
}

function extractCustomerList(raw: unknown): {
  list: ApiCustomer[];
  totalPages: number;
} {
  if (Array.isArray(raw)) {
    return { list: raw as ApiCustomer[], totalPages: 1 };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['items', 'customers', 'data', 'results', 'docs']) {
      const v = o[key];
      if (Array.isArray(v)) {
        const totalPages =
          typeof o.totalPages === 'number' && o.totalPages > 0 ? o.totalPages : 1;
        return { list: v as ApiCustomer[], totalPages };
      }
    }
  }
  return { list: [], totalPages: 1 };
}

/** Fetch all pages (or a filtered slice) of customers. */
export async function fetchCustomers(
  params: FetchCustomersParams = {}
): Promise<MappedCustomer[]> {
  const all: MappedCustomer[] = [];
  let page = params.page ?? 1;
  const limit = params.limit ?? 100;
  let totalPages = 1;
  const singlePage = params.page !== undefined;

  do {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('limit', String(limit));
    if (params.q?.trim()) query.set('q', params.q.trim());

    const res = await fetch(apiUrl(`/api/customers?${query.toString()}`), {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res));
    const { list, totalPages: pages } = extractCustomerList(await res.json());
    for (const c of list) all.push(mapApiCustomer(c));
    totalPages = pages;
    if (singlePage) break;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export async function fetchCustomerById(id: string): Promise<MappedCustomer> {
  const res = await fetch(customerResourceUrl(id), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiCustomer((await res.json()) as ApiCustomer);
}

export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<MappedCustomer> {
  const res = await fetch(apiUrl('/api/customers'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(toCreateBody(payload)),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiCustomer((await res.json()) as ApiCustomer);
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload
): Promise<MappedCustomer> {
  const body = toPatchBody(payload);
  if (Object.keys(body).length === 0) {
    throw new Error('No customer fields to update');
  }
  const res = await fetch(customerResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiCustomer((await res.json()) as ApiCustomer);
}

/** Soft-deletes on the server (status inactive); drop from local lists after. */
export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(customerResourceUrl(id), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}
