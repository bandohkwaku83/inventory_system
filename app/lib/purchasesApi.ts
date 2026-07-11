import { apiUrl, readApiError } from './productsApi';

export interface ApiProductRef {
  _id: string;
  sku?: string;
  name: string;
  category?: unknown;
  unit?: string;
  stockQuantity?: number;
  [key: string]: unknown;
}

export interface ApiLineItem {
  product?: ApiProductRef;
  productId?: string;
  quantity: number;
  unitPrice: number;
  _id?: string;
}

export interface ApiSupplierRef {
  _id: string;
  name: string;
  contactPerson?: string;
  category?: string;
  [key: string]: unknown;
}

export interface ApiPaymentRecord {
  _id: string;
  amount: number;
  recordedAt: string;
}

export interface ApiPurchase {
  _id: string;
  date: string;
  supplier?: ApiSupplierRef | string;
  invoiceNumber?: string;
  amountPaid: number;
  currency?: string;
  lineItems?: ApiLineItem[];
  items?: ApiLineItem[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  payments?: ApiPaymentRecord[];
  purchaseTotal?: number;
  balance?: number;
  paymentStatus?: string;
}

export function purchaseResourceUrl(id: string): string {
  return apiUrl(`/api/purchases/${encodeURIComponent(id)}`);
}

export function purchasePaymentsUrl(id: string): string {
  return `${purchaseResourceUrl(id)}/payments`;
}

function toYmd(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function mapSupplierRef(sup: ApiPurchase['supplier']) {
  if (sup == null) return { id: '', name: '—' };
  if (typeof sup === 'string') return { id: sup, name: '—' };
  return { id: sup._id ?? '', name: sup.name ?? '—' };
}

/** Backend may return a bare array or `{ data: [...] }`, etc. */
export function extractPurchasesArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of ['data', 'purchases', 'items', 'results', 'docs', 'rows']) {
      const v = o[key];
      if (Array.isArray(v)) return v as unknown[];
    }
  }
  return null;
}

export function mapApiLineItem(li: ApiLineItem) {
  const prod = li.product;
  const productId = prod?._id ?? li.productId;
  const name = prod?.name ?? (li.productId ? `Product ${li.productId.slice(-6)}` : 'Product');
  const unit = prod?.unit ?? 'units';
  const qty = li.quantity;
  const up = li.unitPrice;
  return {
    productId,
    name,
    unit,
    quantity: qty,
    unitPrice: up,
    total: +(qty * up).toFixed(2),
  };
}

export function mapApiPurchase(p: ApiPurchase) {
  const rawLines = p.lineItems ?? p.items ?? [];
  const items = rawLines.map(mapApiLineItem);
  const lineSum = +items.reduce((s, i) => s + i.total, 0).toFixed(2);
  const totalCost =
    typeof p.purchaseTotal === 'number' && Number.isFinite(p.purchaseTotal)
      ? p.purchaseTotal
      : lineSum;
  const ps = p.paymentStatus?.toLowerCase();
  let paymentStatus: 'paid' | 'partial' | 'unpaid' | undefined;
  if (ps === 'paid' || ps === 'partial' || ps === 'unpaid') {
    paymentStatus = ps;
  }
  const { id: supplierId, name: supplierName } = mapSupplierRef(p.supplier);
  return {
    id: p._id,
    date: toYmd(p.date),
    supplierId,
    supplierName,
    invoiceNumber: p.invoiceNumber,
    items,
    totalCost,
    amountPaid: p.amountPaid ?? 0,
    currency: p.currency,
    status: 'completed' as const,
    paymentStatus,
    balance: p.balance,
    payments: p.payments?.map((x) => ({
      id: x._id,
      amount: x.amount,
      recordedAt: x.recordedAt,
    })),
  };
}

export function safeMapApiPurchase(raw: unknown): ReturnType<typeof mapApiPurchase> | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<ApiPurchase>;
  if (typeof p._id !== 'string' || !p._id) return null;
  try {
    return mapApiPurchase(p as ApiPurchase);
  } catch {
    return null;
  }
}

export interface PurchasesSummaryDto {
  purchaseCount: number;
  unpaidInvoicesCount: number;
  totalSpend: number;
  outstanding: number;
  currency?: string;
}
