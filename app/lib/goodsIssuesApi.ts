import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type GoodsIssueStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'rejected'
  | 'cancelled';

export interface GoodsIssuesMeta {
  statuses: GoodsIssueStatus[];
  workflow: GoodsIssueStatus[];
  cancelledFrom: GoodsIssueStatus[];
}

export interface GoodsIssueWarehouseRef {
  id: string;
  code: string;
  name: string;
}

export interface GoodsIssueProductRef {
  id: string;
  name: string;
  sku: string;
}

export interface GoodsIssueLocationRef {
  id: string;
  code: string;
  name: string;
  fullPath: string;
  type: string;
}

export interface GoodsIssueUserRef {
  id: string;
  name: string;
  email: string;
}

export interface GoodsIssueApprovalRef {
  id: string;
  approvalNumber: string;
  type: string;
  status: string;
  title: string;
}

export interface GoodsIssueLine {
  id: string;
  product: GoodsIssueProductRef;
  quantity: number;
  location: GoodsIssueLocationRef | null;
}

export interface GoodsIssue {
  id: string;
  issueNumber: string;
  warehouse: GoodsIssueWarehouseRef;
  department: string;
  requesterName: string;
  lines: GoodsIssueLine[];
  status: GoodsIssueStatus;
  notes: string;
  requestedBy: GoodsIssueUserRef | null;
  approvedBy: GoodsIssueUserRef | null;
  approvedAt: string | null;
  issuedBy: GoodsIssueUserRef | null;
  issuedAt: string | null;
  rejectedBy: GoodsIssueUserRef | null;
  rejectedAt: string | null;
  rejectionReason: string;
  cancelledAt: string | null;
  approval: GoodsIssueApprovalRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsIssuesListParams {
  page?: number;
  limit?: number;
  status?: GoodsIssueStatus | '';
  warehouseId?: string;
  q?: string;
}

export interface GoodsIssuesListResult {
  items: GoodsIssue[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GoodsIssueLineInput {
  productId: string;
  quantity: number;
  locationId?: string | null;
}

export interface CreateGoodsIssuePayload {
  warehouseId: string;
  department?: string;
  requesterName?: string;
  notes?: string;
  lines: GoodsIssueLineInput[];
  submit?: boolean;
}

export interface UpdateGoodsIssuePayload {
  warehouseId?: string;
  department?: string;
  requesterName?: string;
  notes?: string;
  lines?: GoodsIssueLineInput[];
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

interface ApiGoodsIssue {
  _id: string;
  issueNumber?: string;
  warehouse?: string | ApiRef;
  department?: string;
  requesterName?: string;
  lines?: ApiLine[];
  status?: string;
  notes?: string;
  requestedBy?: string | ApiRef | null;
  approvedBy?: string | ApiRef | null;
  approvedAt?: string | null;
  issuedBy?: string | ApiRef | null;
  issuedAt?: string | null;
  rejectedBy?: string | ApiRef | null;
  rejectedAt?: string | null;
  rejectionReason?: string;
  cancelledAt?: string | null;
  approval?: string | ApiApproval | null;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_META: GoodsIssuesMeta = {
  statuses: ['draft', 'pending_approval', 'approved', 'issued', 'rejected', 'cancelled'],
  workflow: ['draft', 'pending_approval', 'approved', 'issued'],
  cancelledFrom: ['draft', 'pending_approval', 'approved'],
};

export const ISSUE_STATUS_LABELS: Record<GoodsIssueStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending',
  approved: 'Approved',
  issued: 'Issued',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const ISSUE_STATUS_COLORS: Record<GoodsIssueStatus, string> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'blue',
  issued: 'success',
  rejected: 'error',
  cancelled: 'default',
};

export const ISSUE_WORKFLOW_STEPS: GoodsIssueStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'issued',
];

function mapWarehouse(ref: string | ApiRef | undefined | null): GoodsIssueWarehouseRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', code: '', name: '' };
  }
  return { id: ref._id, code: ref.code ?? '', name: ref.name ?? '' };
}

function mapProduct(ref: string | ApiRef | undefined | null): GoodsIssueProductRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', name: '—', sku: '' };
  }
  return { id: ref._id, name: ref.name ?? '—', sku: ref.sku ?? '' };
}

function mapLocation(ref: string | ApiRef | undefined | null): GoodsIssueLocationRef | null {
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

function mapUser(ref: string | ApiRef | undefined | null): GoodsIssueUserRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') return { id: ref, name: '', email: '' };
  return { id: ref._id, name: ref.name ?? '', email: ref.email ?? '' };
}

function mapApproval(ref: string | ApiApproval | undefined | null): GoodsIssueApprovalRef | null {
  if (!ref || typeof ref === 'string') return null;
  return {
    id: ref._id,
    approvalNumber: ref.approvalNumber ?? '',
    type: ref.type ?? '',
    status: ref.status ?? '',
    title: ref.title ?? '',
  };
}

function normalizeStatus(raw?: string): GoodsIssueStatus {
  if (
    raw === 'draft' ||
    raw === 'pending_approval' ||
    raw === 'approved' ||
    raw === 'issued' ||
    raw === 'rejected' ||
    raw === 'cancelled'
  ) {
    return raw;
  }
  if (raw === 'completed' || raw === 'picked') return 'issued';
  if (raw === 'pending') return 'pending_approval';
  return 'draft';
}

export function mapApiGoodsIssue(r: ApiGoodsIssue): GoodsIssue {
  return {
    id: r._id,
    issueNumber: r.issueNumber ?? '',
    warehouse: mapWarehouse(r.warehouse),
    department: r.department ?? '',
    requesterName: r.requesterName ?? '',
    lines: (r.lines ?? []).map((line, idx) => ({
      id: line._id ?? `line-${idx}`,
      product: mapProduct(line.product),
      quantity: typeof line.quantity === 'number' ? line.quantity : 0,
      location: mapLocation(line.location),
    })),
    status: normalizeStatus(r.status),
    notes: r.notes ?? '',
    requestedBy: mapUser(r.requestedBy),
    approvedBy: mapUser(r.approvedBy),
    approvedAt: r.approvedAt ?? null,
    issuedBy: mapUser(r.issuedBy),
    issuedAt: r.issuedAt ?? null,
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
  return apiUrl(`/api/goods-issues/${encodeURIComponent(id)}`);
}

function toLineBody(lines: GoodsIssueLineInput[]) {
  return lines.map((line) => {
    const body: Record<string, unknown> = {
      productId: line.productId,
      quantity: line.quantity,
    };
    if (line.locationId) body.locationId = line.locationId;
    return body;
  });
}

export async function fetchGoodsIssuesMeta(): Promise<GoodsIssuesMeta> {
  const res = await fetch(apiUrl('/api/goods-issues/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<GoodsIssuesMeta>;
  return {
    statuses: Array.isArray(data.statuses) ? (data.statuses as GoodsIssueStatus[]) : DEFAULT_META.statuses,
    workflow: Array.isArray(data.workflow) ? (data.workflow as GoodsIssueStatus[]) : DEFAULT_META.workflow,
    cancelledFrom: Array.isArray(data.cancelledFrom)
      ? (data.cancelledFrom as GoodsIssueStatus[])
      : DEFAULT_META.cancelledFrom,
  };
}

export async function fetchGoodsIssues(
  params: GoodsIssuesListParams = {}
): Promise<GoodsIssuesListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.status) query.set('status', params.status);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/goods-issues?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiGoodsIssue[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiGoodsIssue),
    page: raw.page ?? 1,
    limit: raw.limit ?? params.limit ?? 50,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function fetchGoodsIssueById(id: string): Promise<GoodsIssue> {
  const res = await fetch(resourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export async function createGoodsIssue(payload: CreateGoodsIssuePayload): Promise<GoodsIssue> {
  const body: Record<string, unknown> = {
    warehouseId: payload.warehouseId,
    lines: toLineBody(payload.lines),
  };
  if (payload.department !== undefined) body.department = payload.department;
  if (payload.requesterName !== undefined) body.requesterName = payload.requesterName;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.submit) body.submit = true;

  const res = await fetch(apiUrl('/api/goods-issues'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export async function updateGoodsIssue(
  id: string,
  payload: UpdateGoodsIssuePayload
): Promise<GoodsIssue> {
  const body: Record<string, unknown> = {};
  if (payload.warehouseId !== undefined) body.warehouseId = payload.warehouseId;
  if (payload.department !== undefined) body.department = payload.department;
  if (payload.requesterName !== undefined) body.requesterName = payload.requesterName;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.lines !== undefined) body.lines = toLineBody(payload.lines);

  if (Object.keys(body).length === 0) throw new Error('No issue fields to update');

  const res = await fetch(resourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export async function submitGoodsIssue(id: string): Promise<GoodsIssue> {
  const res = await fetch(`${resourceUrl(id)}/submit`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export async function approveGoodsIssue(
  id: string,
  reviewNotes?: string
): Promise<GoodsIssue> {
  const res = await fetch(`${resourceUrl(id)}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reviewNotes ? { reviewNotes } : {}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export async function rejectGoodsIssue(id: string, reason: string): Promise<GoodsIssue> {
  const res = await fetch(`${resourceUrl(id)}/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

/** Store keeper pick / issue stock after approval. */
export async function issueGoodsIssue(id: string): Promise<GoodsIssue> {
  const res = await fetch(`${resourceUrl(id)}/issue`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export async function cancelGoodsIssue(id: string): Promise<GoodsIssue> {
  const res = await fetch(`${resourceUrl(id)}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiGoodsIssue((await res.json()) as ApiGoodsIssue);
}

export function issueLineCount(r: GoodsIssue): number {
  return r.lines.length;
}

export function issueTotalQty(r: GoodsIssue): number {
  return r.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function formatIssuePerson(user: GoodsIssueUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

export function formatIssueDate(value: string | null | undefined): string {
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
