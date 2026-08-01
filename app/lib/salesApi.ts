import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type SaleStatus = 'pending' | 'completed' | 'voided';

export interface ApiSaleItem {
  _id?: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export interface ApiSale {
  _id: string;
  receiptId: string;
  receiptNumber?: string;
  saleNumber?: string;
  timestamp: string;
  date: string;
  time: string;
  customer: string;
  customerId?: string | null;
  servedBy?: string;
  servedByName?: string;
  paymentMethod: 'Cash' | 'Mobile Money';
  subtotal: number;
  discount: number;
  total: number;
  cashTendered?: number;
  change?: number;
  items: ApiSaleItem[];
  status?: string;
  stockApplied?: boolean;
}

export interface CreateSalePayload {
  customer?: string;
  customerId?: string | null;
  paymentMethod: 'Cash' | 'Mobile Money';
  discount?: number;
  cashTendered?: number;
  items: Array<{
    productId: string;
    quantity: number;
    price?: number;
  }>;
  timestamp?: string;
  /** pending = parked cart; completed = finalized sale */
  status?: SaleStatus;
}

export interface UpdateSalePayload {
  customer?: string;
  customerId?: string | null;
  paymentMethod?: 'Cash' | 'Mobile Money';
  discount?: number;
  cashTendered?: number;
  items?: Array<{
    productId: string;
    quantity: number;
    price?: number;
  }>;
  status?: SaleStatus;
}

export interface MappedSale {
  id: string;
  apiId: string;
  timestamp: string;
  date: string;
  time: string;
  customer: string;
  customerId?: string;
  servedBy?: string;
  servedByName?: string;
  paymentMethod: 'Cash' | 'Mobile Money';
  subtotal: number;
  discount: number;
  total: number;
  cashTendered?: number;
  change?: number;
  items: Array<{
    id: string;
    name: string;
    sku?: string;
    price: number;
    quantity: number;
  }>;
  status: SaleStatus;
}

function normalizeStatus(raw?: string): SaleStatus {
  if (raw === 'pending' || raw === 'voided' || raw === 'completed') return raw;
  return 'completed';
}

export function mapApiSale(sale: ApiSale): MappedSale {
  const customerId =
    sale.customerId != null && String(sale.customerId).trim()
      ? String(sale.customerId)
      : undefined;
  return {
    id: sale.receiptId || sale._id,
    apiId: sale._id,
    timestamp: sale.timestamp,
    date: sale.date,
    time: sale.time,
    customer: sale.customer || 'Walk-in',
    customerId,
    servedBy: sale.servedBy,
    servedByName: sale.servedByName,
    paymentMethod: sale.paymentMethod,
    subtotal: sale.subtotal,
    discount: sale.discount ?? 0,
    total: sale.total,
    cashTendered: sale.cashTendered,
    change: sale.change,
    items: (sale.items || []).map((item) => ({
      id: String(item.productId),
      name: item.name,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
    })),
    status: normalizeStatus(sale.status),
  };
}

export type SalesListScope = {
  viewAll: boolean;
  viewHistory: boolean;
  ownOnly: boolean;
  todayOnly: boolean;
  today: string;
};

export async function fetchSales(
  status?: Exclude<SaleStatus, 'voided'>,
  options?: {
    from?: string;
    to?: string;
    date?: string;
    servedBy?: string;
  }
): Promise<{ sales: MappedSale[]; scope?: SalesListScope }> {
  const all: MappedSale[] = [];
  let page = 1;
  let totalPages = 1;
  let scope: SalesListScope | undefined;

  do {
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('limit', '100');
    if (status) query.set('status', status);
    if (options?.from) query.set('from', options.from);
    if (options?.to) query.set('to', options.to);
    if (options?.date) query.set('date', options.date);
    if (options?.servedBy) query.set('servedBy', options.servedBy);

    const res = await fetch(apiUrl(`/api/sales?${query.toString()}`), {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res));
    const raw = (await res.json()) as {
      items?: ApiSale[];
      sales?: ApiSale[];
      totalPages?: number;
      scope?: SalesListScope;
    };
    if (raw.scope) scope = raw.scope;
    const list = raw.items ?? raw.sales ?? [];
    for (const sale of list) {
      if (sale.status === 'voided') continue;
      all.push(mapApiSale(sale));
    }
    totalPages =
      typeof raw.totalPages === 'number' && raw.totalPages > 0 ? raw.totalPages : 1;
    page += 1;
  } while (page <= totalPages);

  return { sales: all, scope };
}

export async function createSale(
  payload: CreateSalePayload,
  idempotencyKey?: string
): Promise<MappedSale> {
  const headers = authHeaders({ 'Content-Type': 'application/json' });
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(apiUrl('/api/sales'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiSale;
  return mapApiSale(data);
}

/** Update an existing sale (e.g. pending → completed, or edit parked cart). */
export async function updateSale(
  id: string,
  payload: UpdateSalePayload
): Promise<MappedSale> {
  const res = await fetch(apiUrl(`/api/sales/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiSale;
  return mapApiSale(data);
}

/** Soft-void a sale (restores stock if it was applied). */
export async function voidSale(id: string): Promise<MappedSale> {
  const res = await fetch(apiUrl(`/api/sales/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  try {
    const data = (await res.json()) as ApiSale;
    return mapApiSale(data);
  } catch {
    return mapApiSale({
      _id: id,
      receiptId: id,
      timestamp: new Date().toISOString(),
      date: '',
      time: '',
      customer: 'Walk-in',
      paymentMethod: 'Cash',
      subtotal: 0,
      discount: 0,
      total: 0,
      items: [],
      status: 'voided',
    });
  }
}
