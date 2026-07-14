import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type StockCountStatus =
  | 'draft'
  | 'counting'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface StockCountsMeta {
  statuses: StockCountStatus[];
  workflow: StockCountStatus[];
  cancelledFrom: StockCountStatus[];
}

export interface StockCountWarehouseRef {
  id: string;
  code: string;
  name: string;
}

export interface StockCountProductRef {
  id: string;
  name: string;
  sku: string;
}

export interface StockCountLocationRef {
  id: string;
  code: string;
  name: string;
  fullPath: string;
  type: string;
}

export interface StockCountUserRef {
  id: string;
  name: string;
  email: string;
}

export interface StockCountApprovalRef {
  id: string;
  approvalNumber: string;
  type: string;
  status: string;
  title: string;
}

export interface StockCountLine {
  id: string;
  product: StockCountProductRef;
  location: StockCountLocationRef | null;
  systemQuantity: number;
  countedQuantity: number | null;
  variance: number | null;
}

export interface StockCount {
  id: string;
  countNumber: string;
  warehouse: StockCountWarehouseRef;
  location: StockCountLocationRef | null;
  lines: StockCountLine[];
  status: StockCountStatus;
  notes: string;
  requestedBy: StockCountUserRef | null;
  approvedBy: StockCountUserRef | null;
  approvedAt: string | null;
  rejectedBy: StockCountUserRef | null;
  rejectedAt: string | null;
  rejectionReason: string;
  cancelledAt: string | null;
  approval: StockCountApprovalRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockCountsListParams {
  page?: number;
  limit?: number;
  status?: StockCountStatus | '';
  warehouseId?: string;
  q?: string;
}

export interface StockCountsListResult {
  items: StockCount[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateStockCountPayload {
  warehouseId: string;
  locationId?: string | null;
  notes?: string;
}

export interface UpdateStockCountLineInput {
  lineId: string;
  countedQuantity: number;
}

export interface UpdateStockCountPayload {
  notes?: string;
  lines?: UpdateStockCountLineInput[];
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
  location?: string | ApiRef | null;
  systemQuantity?: number;
  countedQuantity?: number | null;
  variance?: number | null;
}

interface ApiApproval {
  _id: string;
  approvalNumber?: string;
  type?: string;
  status?: string;
  title?: string;
}

interface ApiStockCount {
  _id: string;
  countNumber?: string;
  warehouse?: string | ApiRef;
  location?: string | ApiRef | null;
  lines?: ApiLine[];
  status?: string;
  notes?: string;
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

const DEFAULT_META: StockCountsMeta = {
  statuses: ['draft', 'counting', 'pending_approval', 'approved', 'rejected', 'cancelled'],
  workflow: ['draft', 'counting', 'pending_approval', 'approved'],
  cancelledFrom: ['draft', 'counting', 'pending_approval'],
};

export const COUNT_STATUS_LABELS: Record<StockCountStatus, string> = {
  draft: 'Draft',
  counting: 'Counting',
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const COUNT_STATUS_COLORS: Record<StockCountStatus, string> = {
  draft: 'default',
  counting: 'blue',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};

export const COUNT_WORKFLOW_STEPS: StockCountStatus[] = [
  'draft',
  'counting',
  'pending_approval',
  'approved',
];

function mapWarehouse(ref: string | ApiRef | undefined | null): StockCountWarehouseRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', code: '', name: '' };
  }
  return { id: ref._id, code: ref.code ?? '', name: ref.name ?? '' };
}

function mapProduct(ref: string | ApiRef | undefined | null): StockCountProductRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', name: '—', sku: '' };
  }
  return { id: ref._id, name: ref.name ?? '—', sku: ref.sku ?? '' };
}

function mapLocation(ref: string | ApiRef | undefined | null): StockCountLocationRef | null {
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

function mapUser(ref: string | ApiRef | undefined | null): StockCountUserRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') return { id: ref, name: '', email: '' };
  return { id: ref._id, name: ref.name ?? '', email: ref.email ?? '' };
}

function mapApproval(ref: string | ApiApproval | undefined | null): StockCountApprovalRef | null {
  if (!ref || typeof ref === 'string') return null;
  return {
    id: ref._id,
    approvalNumber: ref.approvalNumber ?? '',
    type: ref.type ?? '',
    status: ref.status ?? '',
    title: ref.title ?? '',
  };
}

function normalizeStatus(raw?: string): StockCountStatus {
  if (
    raw === 'draft' ||
    raw === 'counting' ||
    raw === 'pending_approval' ||
    raw === 'approved' ||
    raw === 'rejected' ||
    raw === 'cancelled'
  ) {
    return raw;
  }
  if (raw === 'in_progress') return 'counting';
  if (raw === 'completed') return 'approved';
  if (raw === 'pending') return 'pending_approval';
  return 'draft';
}

function lineVariance(systemQuantity: number, countedQuantity: number | null): number | null {
  if (countedQuantity === null || countedQuantity === undefined) return null;
  return countedQuantity - systemQuantity;
}

export function mapApiStockCount(r: ApiStockCount): StockCount {
  return {
    id: r._id,
    countNumber: r.countNumber ?? '',
    warehouse: mapWarehouse(r.warehouse),
    location: mapLocation(r.location),
    lines: (r.lines ?? []).map((line, idx) => {
      const systemQuantity = typeof line.systemQuantity === 'number' ? line.systemQuantity : 0;
      const countedQuantity =
        typeof line.countedQuantity === 'number' ? line.countedQuantity : null;
      const variance =
        typeof line.variance === 'number'
          ? line.variance
          : lineVariance(systemQuantity, countedQuantity);
      return {
        id: line._id ?? `line-${idx}`,
        product: mapProduct(line.product),
        location: mapLocation(line.location),
        systemQuantity,
        countedQuantity,
        variance,
      };
    }),
    status: normalizeStatus(r.status),
    notes: r.notes ?? '',
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
  return apiUrl(`/api/stock-counts/${encodeURIComponent(id)}`);
}

export async function fetchStockCountsMeta(): Promise<StockCountsMeta> {
  const res = await fetch(apiUrl('/api/stock-counts/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<StockCountsMeta>;
  return {
    statuses: Array.isArray(data.statuses) ? (data.statuses as StockCountStatus[]) : DEFAULT_META.statuses,
    workflow: Array.isArray(data.workflow) ? (data.workflow as StockCountStatus[]) : DEFAULT_META.workflow,
    cancelledFrom: Array.isArray(data.cancelledFrom)
      ? (data.cancelledFrom as StockCountStatus[])
      : DEFAULT_META.cancelledFrom,
  };
}

export async function fetchStockCounts(
  params: StockCountsListParams = {}
): Promise<StockCountsListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.status) query.set('status', params.status);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/stock-counts?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiStockCount[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiStockCount),
    page: raw.page ?? 1,
    limit: raw.limit ?? params.limit ?? 50,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function fetchStockCountById(id: string): Promise<StockCount> {
  const res = await fetch(resourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export async function createStockCount(payload: CreateStockCountPayload): Promise<StockCount> {
  const body: Record<string, unknown> = {
    warehouseId: payload.warehouseId,
  };
  if (payload.locationId) body.locationId = payload.locationId;
  if (payload.notes !== undefined) body.notes = payload.notes;

  const res = await fetch(apiUrl('/api/stock-counts'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export async function updateStockCount(
  id: string,
  payload: UpdateStockCountPayload
): Promise<StockCount> {
  const body: Record<string, unknown> = {};
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.lines !== undefined) {
    body.lines = payload.lines.map((line) => ({
      lineId: line.lineId,
      countedQuantity: line.countedQuantity,
    }));
  }

  if (Object.keys(body).length === 0) throw new Error('No count fields to update');

  const res = await fetch(resourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export async function submitStockCount(id: string): Promise<StockCount> {
  const res = await fetch(`${resourceUrl(id)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export async function approveStockCount(
  id: string,
  reviewNotes?: string
): Promise<StockCount> {
  const res = await fetch(`${resourceUrl(id)}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reviewNotes ? { reviewNotes } : {}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export async function rejectStockCount(id: string, reason: string): Promise<StockCount> {
  const res = await fetch(`${resourceUrl(id)}/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export async function cancelStockCount(id: string): Promise<StockCount> {
  const res = await fetch(`${resourceUrl(id)}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockCount((await res.json()) as ApiStockCount);
}

export function countVarianceTotal(c: StockCount): number {
  return c.lines.reduce((sum, line) => sum + (line.variance ?? 0), 0);
}

export function formatCountPerson(user: StockCountUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

export function formatCountDate(value: string | null | undefined): string {
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
