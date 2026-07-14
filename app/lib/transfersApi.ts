import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type TransferStatus =
  | 'draft'
  | 'pending_approval'
  | 'in_transit'
  | 'received'
  | 'cancelled';

export interface TransfersMeta {
  statuses: TransferStatus[];
  workflow: TransferStatus[];
  cancelledFrom: TransferStatus[];
}

export interface TransferWarehouseRef {
  id: string;
  code: string;
  name: string;
}

export interface TransferProductRef {
  id: string;
  name: string;
  sku: string;
}

export interface TransferLocationRef {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface TransferUserRef {
  id: string;
  name: string;
  email: string;
}

export interface TransferApprovalRef {
  id: string;
  approvalNumber: string;
  type: string;
  status: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  reviewNotes: string;
  reviewedAt?: string | null;
}

export interface TransferLine {
  id: string;
  product: TransferProductRef;
  quantity: number;
  fromLocation: TransferLocationRef | null;
  toLocation: TransferLocationRef | null;
}

export interface WarehouseTransfer {
  id: string;
  transferNumber: string;
  fromWarehouse: TransferWarehouseRef;
  toWarehouse: TransferWarehouseRef;
  lines: TransferLine[];
  status: TransferStatus;
  notes: string;
  requestedBy: TransferUserRef | null;
  approvedBy: TransferUserRef | null;
  approvedAt: string | null;
  rejectedBy: TransferUserRef | null;
  rejectedAt: string | null;
  rejectionReason: string;
  shippedAt: string | null;
  receivedAt: string | null;
  receivedBy: TransferUserRef | null;
  cancelledAt: string | null;
  cancelledBy: TransferUserRef | null;
  approval: TransferApprovalRef | null;
  stockDeducted: boolean;
  stockReceived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransfersListParams {
  page?: number;
  limit?: number;
  status?: TransferStatus | '';
  fromWarehouseId?: string;
  toWarehouseId?: string;
  warehouseId?: string;
  q?: string;
}

export interface TransfersListResult {
  items: WarehouseTransfer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransferLineInput {
  productId: string;
  quantity: number;
  fromLocationId?: string | null;
  toLocationId?: string | null;
}

export interface CreateTransferPayload {
  fromWarehouseId: string;
  toWarehouseId: string;
  notes?: string;
  lines: TransferLineInput[];
  /** When true, creates as pending_approval with an approval record. */
  submit?: boolean;
}

export interface UpdateTransferPayload {
  fromWarehouseId?: string;
  toWarehouseId?: string;
  notes?: string;
  lines?: TransferLineInput[];
}

interface ApiWarehouseRef {
  _id: string;
  code?: string;
  name?: string;
}

interface ApiProductRef {
  _id: string;
  name?: string;
  sku?: string;
}

interface ApiLocationRef {
  _id: string;
  code?: string;
  name?: string;
  type?: string;
}

interface ApiUserRef {
  _id: string;
  name?: string;
  email?: string;
}

interface ApiApprovalRef {
  _id: string;
  approvalNumber?: string;
  type?: string;
  status?: string;
  title?: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  reviewNotes?: string;
  reviewedAt?: string | null;
}

interface ApiTransferLine {
  _id?: string;
  product?: string | ApiProductRef;
  quantity?: number;
  fromLocation?: string | ApiLocationRef | null;
  toLocation?: string | ApiLocationRef | null;
}

interface ApiWarehouseTransfer {
  _id: string;
  transferNumber?: string;
  fromWarehouse?: string | ApiWarehouseRef;
  toWarehouse?: string | ApiWarehouseRef;
  lines?: ApiTransferLine[];
  status?: string;
  notes?: string;
  requestedBy?: string | ApiUserRef | null;
  approvedBy?: string | ApiUserRef | null;
  approvedAt?: string | null;
  rejectedBy?: string | ApiUserRef | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  shippedAt?: string | null;
  receivedAt?: string | null;
  receivedBy?: string | ApiUserRef | null;
  cancelledAt?: string | null;
  cancelledBy?: string | ApiUserRef | null;
  approval?: string | ApiApprovalRef | null;
  stockDeducted?: boolean;
  stockReceived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_META: TransfersMeta = {
  statuses: ['draft', 'pending_approval', 'in_transit', 'received', 'cancelled'],
  workflow: ['draft', 'pending_approval', 'in_transit', 'received'],
  cancelledFrom: ['draft', 'pending_approval', 'in_transit'],
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  in_transit: 'In transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  draft: 'default',
  pending_approval: 'warning',
  in_transit: 'blue',
  received: 'success',
  cancelled: 'error',
};

/** Happy-path stepper steps (cancelled is handled separately). */
export const TRANSFER_WORKFLOW_STEPS: TransferStatus[] = [
  'draft',
  'pending_approval',
  'in_transit',
  'received',
];

function asId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && '_id' in value) {
    return String((value as { _id: string })._id);
  }
  return '';
}

function mapWarehouse(ref: string | ApiWarehouseRef | undefined | null): TransferWarehouseRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', code: '', name: '' };
  }
  return {
    id: ref._id,
    code: ref.code ?? '',
    name: ref.name ?? '',
  };
}

function mapProduct(ref: string | ApiProductRef | undefined | null): TransferProductRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', name: '—', sku: '' };
  }
  return {
    id: ref._id,
    name: ref.name ?? '—',
    sku: ref.sku ?? '',
  };
}

function mapLocation(
  ref: string | ApiLocationRef | undefined | null
): TransferLocationRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') {
    return { id: ref, code: '', name: '', type: '' };
  }
  return {
    id: ref._id,
    code: ref.code ?? '',
    name: ref.name ?? '',
    type: ref.type ?? '',
  };
}

function mapUser(ref: string | ApiUserRef | undefined | null): TransferUserRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') {
    return { id: ref, name: '', email: '' };
  }
  return {
    id: ref._id,
    name: ref.name ?? '',
    email: ref.email ?? '',
  };
}

function mapApproval(
  ref: string | ApiApprovalRef | undefined | null
): TransferApprovalRef | null {
  if (!ref || typeof ref === 'string') return null;
  return {
    id: ref._id,
    approvalNumber: ref.approvalNumber ?? '',
    type: ref.type ?? '',
    status: ref.status ?? '',
    title: ref.title ?? '',
    description: ref.description ?? '',
    entityType: ref.entityType ?? '',
    entityId: ref.entityId ?? '',
    reviewNotes: ref.reviewNotes ?? '',
    reviewedAt: ref.reviewedAt ?? null,
  };
}

function normalizeStatus(raw?: string): TransferStatus {
  if (
    raw === 'draft' ||
    raw === 'pending_approval' ||
    raw === 'in_transit' ||
    raw === 'received' ||
    raw === 'cancelled'
  ) {
    return raw;
  }
  return 'draft';
}

export function mapApiTransfer(t: ApiWarehouseTransfer): WarehouseTransfer {
  return {
    id: t._id,
    transferNumber: t.transferNumber ?? '',
    fromWarehouse: mapWarehouse(t.fromWarehouse),
    toWarehouse: mapWarehouse(t.toWarehouse),
    lines: (t.lines ?? []).map((line, idx) => ({
      id: line._id ?? `line-${idx}`,
      product: mapProduct(line.product),
      quantity: typeof line.quantity === 'number' ? line.quantity : 0,
      fromLocation: mapLocation(line.fromLocation),
      toLocation: mapLocation(line.toLocation),
    })),
    status: normalizeStatus(t.status),
    notes: t.notes ?? '',
    requestedBy: mapUser(t.requestedBy),
    approvedBy: mapUser(t.approvedBy),
    approvedAt: t.approvedAt ?? null,
    rejectedBy: mapUser(t.rejectedBy),
    rejectedAt: t.rejectedAt ?? null,
    rejectionReason: t.rejectionReason ?? '',
    shippedAt: t.shippedAt ?? null,
    receivedAt: t.receivedAt ?? null,
    receivedBy: mapUser(t.receivedBy),
    cancelledAt: t.cancelledAt ?? null,
    cancelledBy: mapUser(t.cancelledBy),
    approval: mapApproval(t.approval),
    stockDeducted: Boolean(t.stockDeducted),
    stockReceived: Boolean(t.stockReceived),
    createdAt: t.createdAt ?? '',
    updatedAt: t.updatedAt ?? '',
  };
}

function transferResourceUrl(id: string): string {
  return apiUrl(`/api/warehouse-transfers/${encodeURIComponent(id)}`);
}

function toLineBody(lines: TransferLineInput[]) {
  return lines.map((line) => {
    const body: Record<string, unknown> = {
      productId: line.productId,
      quantity: line.quantity,
    };
    if (line.fromLocationId) body.fromLocationId = line.fromLocationId;
    if (line.toLocationId) body.toLocationId = line.toLocationId;
    return body;
  });
}

export async function fetchTransfersMeta(): Promise<TransfersMeta> {
  const res = await fetch(apiUrl('/api/warehouse-transfers/meta'), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<TransfersMeta>;
  return {
    statuses: Array.isArray(data.statuses) ? (data.statuses as TransferStatus[]) : DEFAULT_META.statuses,
    workflow: Array.isArray(data.workflow) ? (data.workflow as TransferStatus[]) : DEFAULT_META.workflow,
    cancelledFrom: Array.isArray(data.cancelledFrom)
      ? (data.cancelledFrom as TransferStatus[])
      : DEFAULT_META.cancelledFrom,
  };
}

export async function fetchTransfers(
  params: TransfersListParams = {}
): Promise<TransfersListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.status) query.set('status', params.status);
  if (params.fromWarehouseId) query.set('fromWarehouseId', params.fromWarehouseId);
  if (params.toWarehouseId) query.set('toWarehouseId', params.toWarehouseId);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/warehouse-transfers?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiWarehouseTransfer[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiTransfer),
    page: raw.page ?? 1,
    limit: raw.limit ?? params.limit ?? 50,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function fetchTransferById(id: string): Promise<WarehouseTransfer> {
  const res = await fetch(transferResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function createTransfer(
  payload: CreateTransferPayload
): Promise<WarehouseTransfer> {
  const body: Record<string, unknown> = {
    fromWarehouseId: payload.fromWarehouseId,
    toWarehouseId: payload.toWarehouseId,
    lines: toLineBody(payload.lines),
  };
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.submit) body.submit = true;

  const res = await fetch(apiUrl('/api/warehouse-transfers'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function updateTransfer(
  id: string,
  payload: UpdateTransferPayload
): Promise<WarehouseTransfer> {
  const body: Record<string, unknown> = {};
  if (payload.fromWarehouseId !== undefined) body.fromWarehouseId = payload.fromWarehouseId;
  if (payload.toWarehouseId !== undefined) body.toWarehouseId = payload.toWarehouseId;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.lines !== undefined) body.lines = toLineBody(payload.lines);

  if (Object.keys(body).length === 0) {
    throw new Error('No transfer fields to update');
  }

  const res = await fetch(transferResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function submitTransfer(id: string): Promise<WarehouseTransfer> {
  const res = await fetch(`${transferResourceUrl(id)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function approveTransfer(
  id: string,
  reviewNotes?: string
): Promise<WarehouseTransfer> {
  const res = await fetch(`${transferResourceUrl(id)}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reviewNotes ? { reviewNotes } : {}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function rejectTransfer(
  id: string,
  reason: string
): Promise<WarehouseTransfer> {
  const res = await fetch(`${transferResourceUrl(id)}/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function receiveTransfer(id: string): Promise<WarehouseTransfer> {
  const res = await fetch(`${transferResourceUrl(id)}/receive`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export async function cancelTransfer(id: string): Promise<WarehouseTransfer> {
  const res = await fetch(`${transferResourceUrl(id)}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiTransfer((await res.json()) as ApiWarehouseTransfer);
}

export function transferLineCount(t: WarehouseTransfer): number {
  return t.lines.length;
}

export function transferTotalQty(t: WarehouseTransfer): number {
  return t.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function isSameWarehouseTransfer(t: WarehouseTransfer): boolean {
  return Boolean(t.fromWarehouse.id && t.fromWarehouse.id === t.toWarehouse.id);
}

export function formatTransferPerson(user: TransferUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

export function formatTransferDate(value: string | null | undefined): string {
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
