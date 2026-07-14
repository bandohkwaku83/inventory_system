import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type StockMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'opening_stock'
  | 'damaged'
  | 'returned'
  | 'internal_move'
  | 'transfer_out'
  | 'transfer_in';

export interface StockMovementsMeta {
  types: StockMovementType[];
  creatableTypes: StockMovementType[];
}

export interface MovementWarehouseRef {
  id: string;
  code: string;
  name: string;
}

export interface MovementProductRef {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
}

export interface MovementLocationRef {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface MovementUserRef {
  id: string;
  name: string;
  email: string;
}

export interface StockMovement {
  id: string;
  movementNumber: string;
  type: StockMovementType | string;
  product: MovementProductRef;
  warehouse: MovementWarehouseRef;
  location: MovementLocationRef | null;
  toWarehouse: MovementWarehouseRef | null;
  toLocation: MovementLocationRef | null;
  quantity: number;
  quantityDelta: number;
  balanceAfter: number | null;
  notes: string;
  referenceType: string;
  referenceId: string | null;
  createdBy: MovementUserRef | null;
  syncProductStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseStockSnapshot {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  sku: string;
  productStockQuantity: number;
  quantity: number;
  location: MovementLocationRef | null;
}

export interface CreateStockMovementResult {
  movement: StockMovement;
  warehouseStock: WarehouseStockSnapshot | null;
  toWarehouseStock: WarehouseStockSnapshot | null;
}

export interface StockMovementsListParams {
  page?: number;
  limit?: number;
  type?: string;
  warehouseId?: string;
  productId?: string;
  from?: string;
  to?: string;
  q?: string;
}

export interface StockMovementsListResult {
  items: StockMovement[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateStockMovementPayload {
  type: StockMovementType;
  productId: string;
  warehouseId: string;
  quantity: number;
  locationId?: string | null;
  toWarehouseId?: string | null;
  toLocationId?: string | null;
  notes?: string;
  syncProductStock?: boolean;
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
  stockQuantity?: number;
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

interface ApiStockMovement {
  _id: string;
  movementNumber?: string;
  type?: string;
  product?: string | ApiProductRef;
  warehouse?: string | ApiWarehouseRef;
  location?: string | ApiLocationRef | null;
  toWarehouse?: string | ApiWarehouseRef | null;
  toLocation?: string | ApiLocationRef | null;
  quantity?: number;
  quantityDelta?: number;
  balanceAfter?: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string | null;
  createdBy?: string | ApiUserRef | null;
  syncProductStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiWarehouseStock {
  _id: string;
  warehouse?: string | ApiWarehouseRef;
  product?: string | ApiProductRef;
  quantity?: number;
  location?: string | ApiLocationRef | null;
}

const ALL_TYPES: StockMovementType[] = [
  'stock_in',
  'stock_out',
  'adjustment',
  'opening_stock',
  'damaged',
  'returned',
  'internal_move',
  'transfer_out',
  'transfer_in',
];

const CREATABLE_TYPES: StockMovementType[] = [
  'stock_in',
  'stock_out',
  'adjustment',
  'opening_stock',
  'damaged',
  'returned',
  'internal_move',
];

const DEFAULT_META: StockMovementsMeta = {
  types: ALL_TYPES,
  creatableTypes: CREATABLE_TYPES,
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  stock_in: 'Stock in',
  stock_out: 'Stock out',
  adjustment: 'Adjustment',
  opening_stock: 'Opening stock',
  damaged: 'Damaged',
  returned: 'Returned',
  internal_move: 'Internal move',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
};

export const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  stock_in: 'success',
  stock_out: 'error',
  adjustment: 'warning',
  opening_stock: 'blue',
  damaged: 'magenta',
  returned: 'cyan',
  internal_move: 'purple',
  transfer_out: 'orange',
  transfer_in: 'geekblue',
};

/** Groups for the record-movement type picker. */
export const CREATABLE_TYPE_GROUPS: Array<{
  label: string;
  types: StockMovementType[];
}> = [
  { label: 'Inbound', types: ['stock_in', 'opening_stock', 'returned'] },
  { label: 'Outbound', types: ['stock_out', 'damaged'] },
  { label: 'Other', types: ['adjustment', 'internal_move'] },
];

export const OUTBOUND_TYPES = new Set<string>(['stock_out', 'damaged', 'internal_move']);

export function movementTypeLabel(type: string): string {
  return MOVEMENT_TYPE_LABELS[type] ?? type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function formatMovementDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMovementPerson(user: MovementUserRef | null): string {
  if (!user) return '—';
  return user.name || user.email || '—';
}

function asId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && '_id' in value) {
    return String((value as { _id: string })._id);
  }
  return '';
}

function mapWarehouse(ref: string | ApiWarehouseRef | undefined | null): MovementWarehouseRef {
  if (!ref || typeof ref === 'string') {
    return { id: typeof ref === 'string' ? ref : '', code: '', name: '' };
  }
  return {
    id: ref._id,
    code: ref.code ?? '',
    name: ref.name ?? '',
  };
}

function mapProduct(ref: string | ApiProductRef | undefined | null): MovementProductRef {
  if (!ref || typeof ref === 'string') {
    return {
      id: typeof ref === 'string' ? ref : '',
      name: '—',
      sku: '',
      stockQuantity: 0,
    };
  }
  return {
    id: ref._id,
    name: ref.name ?? '—',
    sku: ref.sku ?? '',
    stockQuantity: typeof ref.stockQuantity === 'number' ? ref.stockQuantity : 0,
  };
}

function mapLocation(
  ref: string | ApiLocationRef | undefined | null
): MovementLocationRef | null {
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

function mapUser(ref: string | ApiUserRef | undefined | null): MovementUserRef | null {
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

export function mapApiStockMovement(m: ApiStockMovement): StockMovement {
  return {
    id: m._id,
    movementNumber: m.movementNumber ?? '',
    type: m.type ?? '',
    product: mapProduct(m.product),
    warehouse: mapWarehouse(m.warehouse),
    location: mapLocation(m.location),
    toWarehouse: m.toWarehouse ? mapWarehouse(m.toWarehouse) : null,
    toLocation: mapLocation(m.toLocation ?? null),
    quantity: typeof m.quantity === 'number' ? m.quantity : 0,
    quantityDelta: typeof m.quantityDelta === 'number' ? m.quantityDelta : 0,
    balanceAfter: typeof m.balanceAfter === 'number' ? m.balanceAfter : null,
    notes: m.notes ?? '',
    referenceType: m.referenceType ?? '',
    referenceId: m.referenceId ? asId(m.referenceId) : null,
    createdBy: mapUser(m.createdBy),
    syncProductStock: m.syncProductStock !== false,
    createdAt: m.createdAt ?? '',
    updatedAt: m.updatedAt ?? '',
  };
}

function mapWarehouseStock(
  raw: ApiWarehouseStock | null | undefined
): WarehouseStockSnapshot | null {
  if (!raw) return null;
  const product = typeof raw.product === 'object' && raw.product ? raw.product : null;
  return {
    id: raw._id,
    warehouseId: asId(raw.warehouse),
    productId: asId(raw.product),
    productName: product?.name ?? '—',
    sku: product?.sku ?? '',
    productStockQuantity:
      typeof product?.stockQuantity === 'number' ? product.stockQuantity : 0,
    quantity: typeof raw.quantity === 'number' ? raw.quantity : 0,
    location: mapLocation(raw.location ?? null),
  };
}

function movementResourceUrl(id: string): string {
  return apiUrl(`/api/stock-movements/${encodeURIComponent(id)}`);
}

function asMovementType(value: unknown): StockMovementType | null {
  const t = String(value ?? '');
  return ALL_TYPES.includes(t as StockMovementType) ? (t as StockMovementType) : null;
}

export async function fetchStockMovementsMeta(): Promise<StockMovementsMeta> {
  const res = await fetch(apiUrl('/api/stock-movements/meta'), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<StockMovementsMeta>;
  const types = Array.isArray(data.types)
    ? data.types.map(asMovementType).filter((t): t is StockMovementType => Boolean(t))
    : DEFAULT_META.types;
  const creatableTypes = Array.isArray(data.creatableTypes)
    ? data.creatableTypes.map(asMovementType).filter((t): t is StockMovementType => Boolean(t))
    : DEFAULT_META.creatableTypes;
  return {
    types: types.length ? types : DEFAULT_META.types,
    creatableTypes: creatableTypes.length ? creatableTypes : DEFAULT_META.creatableTypes,
  };
}

export async function fetchStockMovements(
  params: StockMovementsListParams = {}
): Promise<StockMovementsListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(Math.min(params.limit ?? 50, 100)));
  if (params.type) query.set('type', params.type);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.productId) query.set('productId', params.productId);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/stock-movements?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    items?: ApiStockMovement[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const list = raw.items ?? [];
  return {
    items: list.map(mapApiStockMovement),
    page: raw.page ?? 1,
    limit: raw.limit ?? params.limit ?? 50,
    total: raw.total ?? list.length,
    totalPages: raw.totalPages && raw.totalPages > 0 ? raw.totalPages : 1,
  };
}

export async function fetchStockMovementById(id: string): Promise<StockMovement> {
  const res = await fetch(movementResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStockMovement((await res.json()) as ApiStockMovement);
}

export async function createStockMovement(
  payload: CreateStockMovementPayload
): Promise<CreateStockMovementResult> {
  const body: Record<string, unknown> = {
    type: payload.type,
    productId: payload.productId,
    warehouseId: payload.warehouseId,
    quantity: payload.quantity,
  };
  if (payload.locationId) body.locationId = payload.locationId;
  if (payload.toWarehouseId) body.toWarehouseId = payload.toWarehouseId;
  if (payload.toLocationId) body.toLocationId = payload.toLocationId;
  if (payload.notes !== undefined) body.notes = payload.notes;
  if (payload.syncProductStock !== undefined) body.syncProductStock = payload.syncProductStock;

  const res = await fetch(apiUrl('/api/stock-movements'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = (await res.json()) as {
    movement?: ApiStockMovement;
    warehouseStock?: ApiWarehouseStock | null;
    toWarehouseStock?: ApiWarehouseStock | null;
  } & ApiStockMovement;

  const movementRaw = raw.movement ?? raw;
  return {
    movement: mapApiStockMovement(movementRaw as ApiStockMovement),
    warehouseStock: mapWarehouseStock(raw.warehouseStock),
    toWarehouseStock: mapWarehouseStock(raw.toWarehouseStock),
  };
}

export function referenceHref(referenceType: string, referenceId: string | null): string | null {
  if (!referenceId) return null;
  if (referenceType === 'StockTransfer' || referenceType === 'WarehouseTransfer') {
    return `/dashboard/warehouse-transfers/${referenceId}`;
  }
  return null;
}
