import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';
import {
  mapApiTransfer,
  type WarehouseTransfer,
} from './transfersApi';

export type ApprovalType =
  | 'purchase'
  | 'expense'
  | 'warehouse_transfer'
  | 'goods_receipt'
  | 'goods_issue'
  | 'stock_count'
  | 'discount'
  | 'credit_request';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ManualApprovalType = Exclude<
  ApprovalType,
  'warehouse_transfer' | 'goods_receipt' | 'goods_issue' | 'stock_count'
>;

export interface ApprovalsMeta {
  types: ApprovalType[];
  statuses: ApprovalStatus[];
}

export interface ApprovalsSummary {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  byStatus: Record<ApprovalStatus, number>;
}

export interface ApprovalUserRef {
  id: string;
  name: string;
  email: string;
}

export interface Approval {
  id: string;
  approvalNumber: string;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  description: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  amount: number | null;
  requestedBy: ApprovalUserRef | null;
  reviewedBy: ApprovalUserRef | null;
  reviewedAt: string | null;
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
  /** Populated on detail for warehouse_transfer */
  entity?: WarehouseTransfer | null;
}

export interface ApprovalsListParams {
  page?: number;
  limit?: number;
  status?: ApprovalStatus | '';
  type?: ApprovalType | '';
  q?: string;
}

export interface ApprovalsListResult {
  items: Approval[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateApprovalPayload {
  type: ManualApprovalType;
  title: string;
  description?: string;
  amount?: number | null;
  entityType?: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}

export interface ApprovalActionResult {
  approval: Approval;
  transfer?: WarehouseTransfer | null;
}

const DEFAULT_META: ApprovalsMeta = {
  types: [
    'purchase',
    'expense',
    'warehouse_transfer',
    'goods_receipt',
    'goods_issue',
    'stock_count',
    'discount',
    'credit_request',
  ],
  statuses: ['pending', 'approved', 'rejected'],
};

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  purchase: 'Purchase',
  expense: 'Expense',
  warehouse_transfer: 'Warehouse transfer',
  goods_receipt: 'Goods receipt',
  goods_issue: 'Goods issue',
  stock_count: 'Stock count',
  discount: 'Discount',
  credit_request: 'Credit request',
};

export const APPROVAL_TYPE_COLORS: Record<ApprovalType, string> = {
  warehouse_transfer: 'blue',
  goods_receipt: 'green',
  goods_issue: 'orange',
  stock_count: 'gold',
  expense: 'orange',
  purchase: 'purple',
  discount: 'cyan',
  credit_request: 'geekblue',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const APPROVAL_STATUS_COLORS: Record<ApprovalStatus, string> = {
  pending: 'processing',
  approved: 'success',
  rejected: 'error',
};

export const MANUAL_APPROVAL_TYPES: ManualApprovalType[] = [
  'purchase',
  'expense',
  'discount',
  'credit_request',
];

interface ApiUserRef {
  _id: string;
  name?: string;
  email?: string;
}

interface ApiApproval {
  _id: string;
  approvalNumber?: string;
  type?: string;
  status?: string;
  title?: string;
  description?: string;
  entityType?: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
  amount?: number | null;
  requestedBy?: string | ApiUserRef | null;
  reviewedBy?: string | ApiUserRef | null;
  reviewedAt?: string | null;
  reviewNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  entity?: unknown;
}

function mapUser(ref: string | ApiUserRef | undefined | null): ApprovalUserRef | null {
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

function normalizeType(raw?: string): ApprovalType {
  if (
    raw === 'purchase' ||
    raw === 'expense' ||
    raw === 'warehouse_transfer' ||
    raw === 'goods_receipt' ||
    raw === 'goods_issue' ||
    raw === 'stock_count' ||
    raw === 'discount' ||
    raw === 'credit_request'
  ) {
    return raw;
  }
  return 'expense';
}

function normalizeStatus(raw?: string): ApprovalStatus {
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') return raw;
  return 'pending';
}

function mapEntity(type: ApprovalType, entity: unknown): WarehouseTransfer | null {
  if (!entity || type !== 'warehouse_transfer') return null;
  try {
    return mapApiTransfer(entity as Parameters<typeof mapApiTransfer>[0]);
  } catch {
    return null;
  }
}

export function mapApiApproval(raw: ApiApproval): Approval {
  const type = normalizeType(raw.type);
  return {
    id: raw._id,
    approvalNumber: raw.approvalNumber ?? '',
    type,
    status: normalizeStatus(raw.status),
    title: raw.title ?? '',
    description: raw.description ?? '',
    entityType: raw.entityType ?? '',
    entityId: raw.entityId ?? null,
    payload: raw.payload && typeof raw.payload === 'object' ? raw.payload : {},
    amount: typeof raw.amount === 'number' ? raw.amount : null,
    requestedBy: mapUser(raw.requestedBy),
    reviewedBy: mapUser(raw.reviewedBy),
    reviewedAt: raw.reviewedAt ?? null,
    reviewNotes: raw.reviewNotes ?? '',
    createdAt: raw.createdAt ?? '',
    updatedAt: raw.updatedAt ?? '',
    entity: mapEntity(type, raw.entity),
  };
}

function approvalResourceUrl(id: string): string {
  return apiUrl(`/api/approvals/${encodeURIComponent(id)}`);
}

export async function fetchApprovalsMeta(): Promise<ApprovalsMeta> {
  const res = await fetch(apiUrl('/api/approvals/meta'), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<ApprovalsMeta>;
  return {
    types: Array.isArray(data.types)
      ? (data.types.filter(Boolean) as ApprovalType[])
      : DEFAULT_META.types,
    statuses: Array.isArray(data.statuses)
      ? (data.statuses.filter(Boolean) as ApprovalStatus[])
      : DEFAULT_META.statuses,
  };
}

export async function fetchApprovalsSummary(): Promise<ApprovalsSummary> {
  const res = await fetch(apiUrl('/api/approvals/summary'), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<ApprovalsSummary> & {
    byStatus?: Partial<Record<ApprovalStatus, number>>;
  };
  const pending = typeof data.pending === 'number' ? data.pending : data.byStatus?.pending ?? 0;
  const approved =
    typeof data.approved === 'number' ? data.approved : data.byStatus?.approved ?? 0;
  const rejected =
    typeof data.rejected === 'number' ? data.rejected : data.byStatus?.rejected ?? 0;
  return {
    pending,
    approved,
    rejected,
    total: typeof data.total === 'number' ? data.total : pending + approved + rejected,
    byStatus: {
      pending,
      approved,
      rejected,
    },
  };
}

export async function fetchApprovals(
  params: ApprovalsListParams = {}
): Promise<ApprovalsListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  const limit = Math.min(params.limit ?? 50, 100);
  query.set('limit', String(limit));
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/approvals?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiApproval[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiApproval),
    page: raw.page ?? 1,
    limit: raw.limit ?? limit,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function fetchApprovalById(id: string): Promise<Approval> {
  const res = await fetch(approvalResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiApproval((await res.json()) as ApiApproval);
}

export async function createApproval(payload: CreateApprovalPayload): Promise<Approval> {
  const body: Record<string, unknown> = {
    type: payload.type,
    title: payload.title.trim(),
  };
  if (payload.description !== undefined) body.description = payload.description;
  if (payload.amount !== undefined && payload.amount !== null) body.amount = payload.amount;
  if (payload.entityType) body.entityType = payload.entityType;
  if (payload.entityId) body.entityId = payload.entityId;
  if (payload.payload && Object.keys(payload.payload).length > 0) {
    body.payload = payload.payload;
  }

  const res = await fetch(apiUrl('/api/approvals'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiApproval((await res.json()) as ApiApproval);
}

function mapActionResponse(raw: {
  approval?: ApiApproval;
  transfer?: unknown;
}): ApprovalActionResult {
  const approvalRaw = raw.approval ?? (raw as unknown as ApiApproval);
  const approval = mapApiApproval(approvalRaw);
  let transfer: WarehouseTransfer | null = null;
  if (raw.transfer) {
    try {
      transfer = mapApiTransfer(raw.transfer as Parameters<typeof mapApiTransfer>[0]);
    } catch {
      transfer = null;
    }
  } else if (approval.entity) {
    transfer = approval.entity;
  }
  return { approval, transfer };
}

export async function approveApproval(
  id: string,
  reviewNotes?: string
): Promise<ApprovalActionResult> {
  const res = await fetch(`${approvalResourceUrl(id)}/approve`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reviewNotes?.trim() ? { reviewNotes: reviewNotes.trim() } : {}),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapActionResponse((await res.json()) as { approval?: ApiApproval; transfer?: unknown });
}

export async function rejectApproval(
  id: string,
  reason: string
): Promise<ApprovalActionResult> {
  const res = await fetch(`${approvalResourceUrl(id)}/reject`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason: reason.trim() }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapActionResponse((await res.json()) as { approval?: ApiApproval; transfer?: unknown });
}

export function formatApprovalPerson(user: ApprovalUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

export function formatApprovalDate(value: string | null | undefined): string {
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

export function formatApprovalAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `GHS ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function isManualApprovalType(type: ApprovalType): type is ManualApprovalType {
  return (
    type !== 'warehouse_transfer' &&
    type !== 'goods_receipt' &&
    type !== 'goods_issue' &&
    type !== 'stock_count'
  );
}

/** Deep-link path for an approval's linked warehouse document, if known. */
export function entityPathForApproval(
  type: ApprovalType,
  entityId: string | null | undefined
): string | null {
  if (!entityId) return null;
  const id = encodeURIComponent(entityId);
  switch (type) {
    case 'warehouse_transfer':
      return `/dashboard/warehouse-transfers/${id}`;
    case 'goods_receipt':
      return `/dashboard/goods-receipts/${id}`;
    case 'goods_issue':
      return `/dashboard/goods-issues/${id}`;
    case 'stock_count':
      return `/dashboard/stock-counts/${id}`;
    default:
      return null;
  }
}

