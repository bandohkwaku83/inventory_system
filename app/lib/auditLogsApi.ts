import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface AuditLogUserRef {
  id: string;
  name: string;
  email: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  user: AuditLogUserRef | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogsListParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  q?: string;
  from?: string;
  to?: string;
}

export interface AuditLogsListResult {
  items: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogsMeta {
  actions: string[];
  entityTypes: string[];
}

interface ApiUserRef {
  _id: string;
  name?: string;
  email?: string;
}

interface ApiAuditLog {
  _id: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  user?: string | ApiUserRef | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

const DEFAULT_META: AuditLogsMeta = {
  actions: [
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'submit',
    'issue',
    'receive',
    'transfer',
    'login',
  ],
  entityTypes: [
    'warehouse',
    'product',
    'goods_receipt',
    'goods_issue',
    'stock_count',
    'warehouse_transfer',
    'approval',
  ],
};

function mapUser(ref: string | ApiUserRef | undefined | null): AuditLogUserRef | null {
  if (!ref) return null;
  if (typeof ref === 'string') return { id: ref, name: '', email: '' };
  return { id: ref._id, name: ref.name ?? '', email: ref.email ?? '' };
}

export function mapApiAuditLog(raw: ApiAuditLog): AuditLogEntry {
  return {
    id: raw._id,
    action: raw.action ?? '',
    entityType: raw.entityType ?? '',
    entityId: raw.entityId ?? '',
    description: raw.description ?? '',
    user: mapUser(raw.user),
    metadata: raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    createdAt: raw.createdAt ?? '',
  };
}

export async function fetchAuditLogsMeta(): Promise<AuditLogsMeta> {
  try {
    const res = await fetch(apiUrl('/api/audit-logs/meta'), { headers: authHeaders() });
    if (!res.ok) return DEFAULT_META;
    const data = (await res.json()) as Partial<AuditLogsMeta>;
    return {
      actions: Array.isArray(data.actions) && data.actions.length ? data.actions : DEFAULT_META.actions,
      entityTypes:
        Array.isArray(data.entityTypes) && data.entityTypes.length
          ? data.entityTypes
          : DEFAULT_META.entityTypes,
    };
  } catch {
    return DEFAULT_META;
  }
}

export async function fetchAuditLogs(
  params: AuditLogsListParams = {}
): Promise<AuditLogsListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.action) query.set('action', params.action);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.userId) query.set('userId', params.userId);
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);

  const res = await fetch(apiUrl(`/api/audit-logs?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiAuditLog[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiAuditLog),
    page: raw.page ?? 1,
    limit: raw.limit ?? params.limit ?? 50,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export function formatAuditPerson(user: AuditLogUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

export function formatAuditDate(value: string | null | undefined): string {
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

export function formatAuditAction(action: string): string {
  if (!action) return '—';
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function relativeAuditTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatAuditDate(value);
}
