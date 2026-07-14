import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type GoodsReceiptStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface GoodsReceiptsMeta {
  statuses: GoodsReceiptStatus[];
  workflow: GoodsReceiptStatus[];
  cancelledFrom: GoodsReceiptStatus[];
}

export interface GoodsReceiptWarehouseRef {
  id: string;
  code: string;
  name: string;
}

export interface GoodsReceiptSupplierRef {
  id: string;
  name: string;
  code?: string;
}

export interface GoodsReceiptProductRef {
  id: string;
  name: string;
  sku: string;
}

export interface GoodsReceiptLocationRef {
  id: string;
  code: string;
  name: string;
  fullPath: string;
  type: string;
}

export interface GoodsReceiptUserRef {
  id: string;
  name: string;
  email: string;
}

export interface GoodsReceiptApprovalRef {
  id: string;
  approvalNumber: string;
  type: string;
  status: string;
  title: string;
}

export interface GoodsReceiptLine {
  id: string;
  product: GoodsReceiptProductRef;
  quantity: number;
  location: GoodsReceiptLocationRef | null;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  warehouse: GoodsReceiptWarehouseRef;
  supplier: GoodsReceiptSupplierRef | null;
  supplierName: string;
  lines: GoodsReceiptLine[];
  status: GoodsReceiptStatus;
  notes: string;
  reference: string;
  requestedBy: GoodsReceiptUserRef | null;
  approvedBy: GoodsReceiptUserRef | null;
  approvedAt: string | null;
  rejectedBy: GoodsReceiptUserRef | null;
  rejectedAt: string | null;
  rejectionReason: string;
  cancelledAt: string | null;
  approval: GoodsReceiptApprovalRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptsListParams {
  page?: number;
  limit?: number;
  status?: GoodsReceiptStatus | '';
  warehouseId?: string;
  q?: string;
}

export interface GoodsReceiptsListResult {
  items: GoodsReceipt[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GoodsReceiptLineInput {
  productId: string;
  quantity: number;
  locationId?: string | null;
}

export interface CreateGoodsReceiptPayload {
  warehouseId: string;
  supplierId?: string | null;
  supplierName?: string;
  notes?: string;
  reference?: string;
  lines: GoodsReceiptLineInput[];
  submit?: boolean;
}

export interface UpdateGoodsReceiptPayload {
  warehouseId?: string;
  supplierId?: string | null;
  supplierName?: string;
  notes?: string;
  reference?: string;
  lines?: GoodsReceiptLineInput[];
}

interface ApiRef {
  _id: string;
  code?: string;
  name?: string;
  sku?: string;
  email?: string;
  type?: string;
  fullPath?: string;
}

interface ApiLine {
  _id?: string;
  product?: string | ApiRef;
  quantity?: number;
  location?: string | ApiRef | null;
}

interface ApiApproval {
  _id: string;
  approvalNumber?: string;
  type?: string;
  status?: string;
  title?: string;
}

interface ApiGoodsReceipt {
  _id: string;
  receiptNumber?: string;
  warehouse?: string | ApiRef;
  supplier?: string | ApiRef | null;
  supplierName?: string;
  lines?: ApiLine[];
  status?: string;
  notes?: string;
  reference?: string;
  requestedBy?: string | ApiRef | null;
  approvedBy?: string | ApiRef | null;
  approvedAt?: string | null;
  rejectedBy?: string | ApiRef | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  cancelledAt?: string | null;
  approval?: string | ApiApproval | null;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_META: GoodsReceiptsMeta = {
  statuses: ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled'],
  workflow: ['draft', 'pending_approval', 'approved'],
  cancelledFrom: ['draft', 'pending_approval'],
};

export const RECEIPT_STATUS_LABELS: Record<GoodsReceiptStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const RECEIPT_STATUS_COLORS: Record<GoodsReceiptStatus, string> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

export const RECEIPT_WORKFLOW_STEPS: GoodsReceiptStatus[] = [
  'draft',
  'pending_approval',
  'approved',
];

function mapWarehouse(ref: string | ApiRef | undefined | null): GoodsReceiptWarehouseRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', code: '', name: '' };
  }
  return { id: ref._id, code: ref.code ?? '', name: ref.name ?? '' };
}

function mapSupplier(ref: string | ApiRef | undefined | null): GoodsReceiptSupplierRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') return { id: ref, name: '' };
  return { id: ref._id, name: ref.name ?? '', code: ref.code };
}

function mapProduct(ref: string | ApiRef | undefined | null): GoodsReceiptProductRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', name: '—', sku: '' };
  }
  return { id: ref._id, name: ref.name ?? '—', sku: ref.sku ?? '' };
}

function mapLocation(ref: string | ApiRef | undefined | null): GoodsReceiptLocationRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') {
    return { id: ref, code: '', name: '', fullPath: '', type: '' };
  }
  return {
    id: ref._id,
    code: ref.code ?? '',
    name: ref.name ?? '',
    fullPath: ref.fullPath ?? ref.code ?? '',
    type: ref.type ?? '',
  };
}

function mapUser(ref: string | ApiRef | undefined | null): GoodsReceiptUserRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') return { id: ref, name: '', email: '' };
  return { id: ref._id, name: ref.name ?? '', email: ref.email ?? '' };
}

function mapApproval(ref: string | ApiApproval | undefined | null): GoodsReceiptApprovalRef | null {
  if (!ref || typeof ref === 'string') return null;
  return {
    id: ref._id,
    approvalNumber: ref.approvalNumber ?? '',
    type: ref.type ?? '',
    status: ref.status ?? '',
    title: ref.title ?? '',
  };
}

function normalizeStatus(raw?: string): GoodsReceiptStatus {
  if (
    raw === 'draft' ||
    raw === 'pending_approval' ||
    raw === 'approved' ||
    raw === 'rejected' ||
    raw === 'cancelled'
  ) {
    return raw;
  }
  if (raw === 'completed' || raw === 'received') return 'approved';
  if (raw === 'pending') return 'pending_approval';
  return 'draft';
}

export function mapApiGoodsReceipt(r: ApiGoodsReceipt): GoodsReceipt {
  const supplier = mapSupplier(r.supplier);
  return {
    id: r._id,
    receiptNumber: r.receiptNumber ?? '',
    warehouse: mapWarehouse(r.warehouse),
    supplier,
    supplierName: r.supplierName || supplier?.name || '',
    lines: (r.lines ?? []).map((line, idx) => ({
      id: line._id ?? `line-${idx}`,
      product: mapProduct(line.product),
      quantity: typeof line.quantity === 'number' ? line.quantity : 0,
      location: mapLocation(line.location),
    })),
    status: normalizeStatus(r.status),
    notes: r.notes ?? '',
    reference: r.reference ?? '',
    requestedBy: mapUser(r.requestedBy),
    approvedBy: mapUser(r.approvedBy),
    approvedAt: r.approvedAt ?? null,
    rejectedBy: mapUser(r.rejectedBy),
    rejectedAt: r.rejectedAt ?? null,
    rejectionReason: r.rejectionReason ?? '',
    cancelledAt: r.cancelledAt ?? null,
    approval: mapApproval(r.approval),
    createdAt: r.createdAt ?? '',
    updatedAt: r.updatedAt ?? '',
  };
}

function resourceUrl(id: string): string {
  return apiUrl(`/api/goods-receipts/${encodeURIComponent(id)}`);
}

function toLineBody(lines: GoodsReceiptLineInput[]) {
  return lines.map((line) => {
    const body: Record<string, unknown> = {
      productId: line.productId,
      quantity: line.quantity,
    };
    if (line.locationId) body.locationId = line.locationId;
    return body;
  });
}

export async function fetchGoodsReceiptsMeta(): Promise<GoodsReceiptsMeta> {
  const res = await fetch(apiUrl('/api/goods-receipts/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<GoodsReceiptsMeta>;
  return {
    statuses: Array.isArray(data.statuses) ? (data.statuses as GoodsReceiptStatus[]) : DEFAULT_META.statuses,
    workflow: Array.isArray(data.workflow) ? (data.workflow as GoodsReceiptStatus[]) : DEFAULT_META.workflow,
    cancelledFrom: Array.isArray(data.cancelledFrom)
      ? (data.cancelledFrom as GoodsReceiptStatus[])
      : DEFAULT_META.cancelledFrom,
  };
}

export async function fetchGoodsReceipts(
  params: GoodsReceiptsListParams = {}
): Promise<GoodsReceiptsListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.status) query.set('status', params.status);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/goods-receipts?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiGoodsReceipt[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiGoodsReceipt),
    page: raw.page ?? 1,
    limit: raw.limit ?? params.limit ?? 50,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function fetchGoodsReceiptById(id: string): Promise<GoodsReceipt> {
  const res = await fetch(resourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export async function createGoodsReceipt(
  payload: CreateGoodsReceiptPayload
): Promise<GoodsReceipt> {
  const body: Record<string, unknown> = {
    warehouseId: payload.warehouseId,
    lines: toLineBody(payload.lines),
  };
  if (payload.supplierId) body.supplierId = payload.supplierId;
  if (payload.supplierName !== undefined) body.supplierName = payload.supplierName;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.reference !== undefined) body.reference = payload.reference;
  if (payload.submit) body.submit = true;

  const res = await fetch(apiUrl('/api/goods-receipts'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export async function updateGoodsReceipt(
  id: string,
  payload: UpdateGoodsReceiptPayload
): Promise<GoodsReceipt> {
  const body: Record<string, unknown> = {};
  if (payload.warehouseId !== undefined) body.warehouseId = payload.warehouseId;
  if (payload.supplierId !== undefined) body.supplierId = payload.supplierId;
  if (payload.supplierName !== undefined) body.supplierName = payload.supplierName;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.reference !== undefined) body.reference = payload.reference;
  if (payload.lines !== undefined) body.lines = toLineBody(payload.lines);

  if (Object.keys(body).length === 0) throw new Error('No receipt fields to update');

  const res = await fetch(resourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export async function submitGoodsReceipt(id: string): Promise<GoodsReceipt> {
  const res = await fetch(`${resourceUrl(id)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export async function approveGoodsReceipt(
  id: string,
  reviewNotes?: string
): Promise<GoodsReceipt> {
  const res = await fetch(`${resourceUrl(id)}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reviewNotes ? { reviewNotes } : {}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export async function rejectGoodsReceipt(id: string, reason: string): Promise<GoodsReceipt> {
  const res = await fetch(`${resourceUrl(id)}/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export async function cancelGoodsReceipt(id: string): Promise<GoodsReceipt> {
  const res = await fetch(`${resourceUrl(id)}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsReceipt((await res.json()) as ApiGoodsReceipt);
}

export function receiptLineCount(r: GoodsReceipt): number {
  return r.lines.length;
}

export function receiptTotalQty(r: GoodsReceipt): number {
  return r.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function formatReceiptPerson(user: GoodsReceiptUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

export function formatReceiptDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
