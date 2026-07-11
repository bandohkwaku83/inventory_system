import { apiUrl } from './productsApi';

export interface ApiProformaItem {
  _id?: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export interface ApiTaxBreakdown {
  total: number;
  taxableValue: number;
  nhil: number;
  getfund: number;
  covid: number;
  vat: number;
  leviesTotal: number;
  taxInclusiveMultiplier: number;
}

export interface ApiProforma {
  _id: string;
  proformaNumber: string;
  customer: string;
  customerPhone?: string;
  date: string;
  validUntil: string;
  status: string;
  notes?: string;
  subtotal: number;
  discount: number;
  total: number;
  items: ApiProformaItem[];
  taxBreakdown?: ApiTaxBreakdown;
  createdAt?: string;
  updatedAt?: string;
}

export function proformaResourceUrl(id: string): string {
  return apiUrl(`/api/proformas/${encodeURIComponent(id)}`);
}

function toYmd(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

const VALID_STATUSES = new Set(['draft', 'sent', 'approved', 'expired']);

/** Backend may return a bare array or `{ data: [...] }`, etc. */
export function extractProformasArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['data', 'proformas', 'items', 'results', 'docs', 'rows']) {
      const v = o[key];
      if (Array.isArray(v)) return v as unknown[];
    }
  }
  return null;
}

export function mapApiProformaItem(item: ApiProformaItem) {
  return {
    id: item._id ?? item.productId,
    productId: item.productId,
    name: item.name,
    sku: item.sku,
    price: item.price,
    quantity: item.quantity,
  };
}

export function mapApiProforma(p: ApiProforma) {
  const status = VALID_STATUSES.has(p.status) ? p.status : 'sent';
  return {
    id: p._id,
    proformaNumber: p.proformaNumber,
    customer: p.customer,
    customerPhone: p.customerPhone,
    date: toYmd(p.date),
    validUntil: toYmd(p.validUntil),
    status: status as 'draft' | 'sent' | 'approved' | 'expired',
    notes: p.notes,
    subtotal: p.subtotal,
    discount: p.discount ?? 0,
    total: p.total,
    items: (p.items ?? []).map(mapApiProformaItem),
    taxBreakdown: p.taxBreakdown,
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt,
  };
}

export function safeMapApiProforma(raw: unknown): ReturnType<typeof mapApiProforma> | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<ApiProforma>;
  if (typeof p._id !== 'string' || !p._id) return null;
  if (typeof p.proformaNumber !== 'string') return null;
  try {
    return mapApiProforma(p as ApiProforma);
  } catch {
    return null;
  }
}
