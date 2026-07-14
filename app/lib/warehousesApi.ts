import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type WarehouseStatus = 'active' | 'inactive';

export type LocationType = 'zone' | 'aisle' | 'rack' | 'shelf' | 'bin';

export interface WarehouseManagerRef {
  id: string;
  name: string;
  email: string;
}

export interface ApiWarehouse {
  _id: string;
  code: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  isDefault?: boolean;
  status?: WarehouseStatus | string;
  managerId?: string | null;
  manager?: string | ApiUserRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  isDefault: boolean;
  status: WarehouseStatus;
  managerId?: string | null;
  manager?: WarehouseManagerRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiStorageLocation {
  _id: string;
  warehouse: string | ApiWarehouse;
  type: LocationType | string;
  parent?: string | ApiStorageLocation | null;
  code: string;
  name: string;
  description?: string;
  fullPath?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  children?: ApiStorageLocation[];
}

export interface StorageLocation {
  id: string;
  warehouseId: string;
  type: LocationType;
  parentId: string | null;
  code: string;
  name: string;
  description: string;
  fullPath?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationNode extends StorageLocation {
  children: LocationNode[];
}

export interface LayoutPreset {
  id: string;
  label: string;
  description: string;
  steps: LocationType[];
}

export interface WarehousesMeta {
  statuses: WarehouseStatus[];
  locationTypes: LocationType[];
  storableTypes: LocationType[];
  allowedParents: Record<string, (LocationType | null)[]>;
  parentTypeByChild: Record<string, LocationType | null>;
  layoutPresets: LayoutPreset[];
  recommended: string;
}

export interface ApiProductRef {
  _id: string;
  name: string;
  sku?: string;
  stockQuantity?: number;
  unit?: string;
  sellingPrice?: number;
}

export interface ApiLocationRef {
  _id: string;
  code: string;
  name: string;
  type?: LocationType | string;
  fullPath?: string;
}

export interface ApiWarehouseStock {
  _id: string;
  warehouse: string | ApiWarehouse;
  product: string | ApiProductRef;
  quantity: number;
  location?: string | ApiLocationRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseInventoryItem {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  productStockQuantity: number;
  quantity: number;
  locationId: string | null;
  locationCode: string;
  locationName: string;
  locationFullPath: string;
  locationType: LocationType | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiUserRef {
  _id: string;
  name?: string;
  email?: string;
}

export interface ApiStockMovement {
  _id: string;
  movementNumber?: string;
  type: string;
  product?: string | ApiProductRef;
  warehouse?: string | ApiWarehouse;
  location?: string | ApiLocationRef | null;
  toWarehouse?: string | ApiWarehouse | null;
  toLocation?: string | ApiLocationRef | null;
  quantity: number;
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

export interface WarehouseHistoryItem {
  id: string;
  movementNumber: string;
  type: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  quantityDelta: number;
  balanceAfter: number | null;
  notes: string;
  locationCode: string;
  locationName: string;
  createdByName: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface WarehousesListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: WarehouseStatus | '';
}

export interface CreateWarehousePayload {
  code: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  phone?: string;
  isDefault?: boolean;
  status?: WarehouseStatus;
  managerId?: string | null;
}

export type UpdateWarehousePayload = Partial<CreateWarehousePayload>;

export interface CreateLocationPayload {
  type: LocationType;
  code: string;
  name: string;
  description?: string;
  parentId?: string | null;
}

export interface AssignLocationPayload {
  productId: string;
  /** Pass `null` to clear the assigned bin. */
  locationId: string | null;
}

export interface UpdateLocationPayload {
  code?: string;
  name?: string;
  description?: string;
  parentId?: string | null;
  isActive?: boolean;
}

/** Derive a warehouse code from a display name (user can override). */
export function suggestWarehouseCode(name: string): string {
  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return 'WH';
  if (words.length === 1) {
    const w = words[0];
    return `WH-${w.slice(0, 6)}`;
  }
  const acronym = words.map((w) => w[0]).join('').slice(0, 6);
  return `WH-${acronym}`;
}

export function locationResourceUrl(warehouseId: string, locationId: string): string {
  return `${warehouseResourceUrl(warehouseId)}/locations/${encodeURIComponent(locationId)}`;
}

export const DEFAULT_WAREHOUSES_META: WarehousesMeta = {
  statuses: ['active', 'inactive'],
  locationTypes: ['zone', 'aisle', 'rack', 'shelf', 'bin'],
  storableTypes: ['bin'],
  allowedParents: {
    zone: [null],
    aisle: [null, 'zone'],
    rack: [null, 'zone', 'aisle'],
    shelf: [null, 'zone', 'aisle', 'rack'],
    bin: [null, 'zone', 'aisle', 'rack', 'shelf'],
  },
  parentTypeByChild: {
    zone: null,
    aisle: 'zone',
    rack: 'zone',
    shelf: 'rack',
    bin: 'shelf',
  },
  layoutPresets: [
    {
      id: 'simple',
      label: 'Simple (recommended)',
      description: 'Zones with bins — fits most shops and small warehouses',
      steps: ['zone', 'bin'],
    },
    {
      id: 'flat',
      label: 'Flat bins only',
      description: 'Named bins directly in the warehouse, no zones',
      steps: ['bin'],
    },
    {
      id: 'rack',
      label: 'Zone + rack + bin',
      description: "When you have racking but don't track every shelf",
      steps: ['zone', 'rack', 'bin'],
    },
    {
      id: 'full',
      label: 'Full hierarchy',
      description: 'Large warehouses: zone → aisle → rack → shelf → bin',
      steps: ['zone', 'aisle', 'rack', 'shelf', 'bin'],
    },
  ],
  recommended: 'simple',
};

function asId(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id ?? '');
  }
  return '';
}

function asLocationType(value: unknown): LocationType {
  const t = String(value ?? '');
  if (t === 'zone' || t === 'aisle' || t === 'rack' || t === 'shelf' || t === 'bin') return t;
  return 'bin';
}

export function warehouseResourceUrl(id: string): string {
  return apiUrl(`/api/warehouses/${encodeURIComponent(id)}`);
}

function mapWarehouseManager(
  w: ApiWarehouse
): { managerId: string | null; manager: WarehouseManagerRef | null } {
  const populated =
    w.manager && typeof w.manager === 'object'
      ? {
          id: String(w.manager._id ?? ''),
          name: w.manager.name ?? '',
          email: w.manager.email ?? '',
        }
      : null;
  const managerId =
    (w.managerId != null && w.managerId !== ''
      ? String(w.managerId)
      : null) ??
    (typeof w.manager === 'string' ? w.manager : null) ??
    populated?.id ??
    null;
  return {
    managerId: managerId || null,
    manager: populated && populated.id ? populated : null,
  };
}

export function mapApiWarehouse(w: ApiWarehouse): Warehouse {
  const status = String(w.status ?? 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active';
  const { managerId, manager } = mapWarehouseManager(w);
  return {
    id: w._id,
    code: w.code ?? '',
    name: w.name ?? '',
    description: w.description ?? '',
    address: w.address ?? '',
    city: w.city ?? '',
    phone: w.phone ?? '',
    isDefault: Boolean(w.isDefault),
    status,
    managerId,
    manager,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

export function mapApiLocation(loc: ApiStorageLocation): StorageLocation {
  const code = loc.code ?? '';
  return {
    id: loc._id,
    warehouseId: asId(loc.warehouse),
    type: asLocationType(loc.type),
    parentId: loc.parent ? asId(loc.parent) : null,
    code,
    name: loc.name ?? '',
    description: loc.description ?? '',
    fullPath: loc.fullPath?.trim() || code || undefined,
    isActive: loc.isActive !== false,
    createdAt: loc.createdAt,
    updatedAt: loc.updatedAt,
  };
}

/** Walk structure and set fullPath as `warehouseCode-zone-...` when API omits it. */
export function buildLocationFullPath(
  nodes: LocationNode[],
  warehouseCode: string,
  parentParts: string[] = []
): LocationNode[] {
  const prefix = warehouseCode.trim();
  return nodes.map((n) => {
    const parts = [...parentParts, n.code].filter(Boolean);
    const built = [prefix, ...parts].filter(Boolean).join('-');
    const fullPath = n.fullPath?.trim() || built || n.code;
    return {
      ...n,
      fullPath,
      children: n.children.length
        ? buildLocationFullPath(n.children, warehouseCode, parts)
        : [],
    };
  });
}

function mapLocationNode(loc: ApiStorageLocation): LocationNode {
  return {
    ...mapApiLocation(loc),
    children: Array.isArray(loc.children) ? loc.children.map(mapLocationNode) : [],
  };
}

export function mapApiInventoryItem(item: ApiWarehouseStock): WarehouseInventoryItem {
  const product = typeof item.product === 'object' && item.product ? item.product : null;
  const location = typeof item.location === 'object' && item.location ? item.location : null;
  const locationCode = location?.code ?? '';
  return {
    id: item._id,
    warehouseId: asId(item.warehouse),
    productId: asId(item.product),
    productName: product?.name ?? '—',
    sku: product?.sku ?? '',
    unit: product?.unit ?? '',
    productStockQuantity:
      typeof product?.stockQuantity === 'number' ? product.stockQuantity : 0,
    quantity: typeof item.quantity === 'number' ? item.quantity : 0,
    locationId: item.location ? asId(item.location) : null,
    locationCode,
    locationName: location?.name ?? '',
    locationFullPath: location?.fullPath?.trim() || locationCode,
    locationType: location?.type ? asLocationType(location.type) : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function mapApiHistoryItem(m: ApiStockMovement): WarehouseHistoryItem {
  const product = typeof m.product === 'object' && m.product ? m.product : null;
  const location = typeof m.location === 'object' && m.location ? m.location : null;
  const createdBy = typeof m.createdBy === 'object' && m.createdBy ? m.createdBy : null;
  return {
    id: m._id,
    movementNumber: m.movementNumber ?? '',
    type: m.type ?? '',
    productId: asId(m.product),
    productName: product?.name ?? '—',
    sku: product?.sku ?? '',
    quantity: typeof m.quantity === 'number' ? m.quantity : 0,
    quantityDelta: typeof m.quantityDelta === 'number' ? m.quantityDelta : 0,
    balanceAfter: typeof m.balanceAfter === 'number' ? m.balanceAfter : null,
    notes: m.notes ?? '',
    locationCode: location?.code ?? '',
    locationName: location?.name ?? '',
    createdByName: createdBy?.name ?? createdBy?.email ?? '—',
    createdAt: m.createdAt ?? '',
  };
}

function extractList<T>(raw: unknown, keys: string[]): { list: T[]; page: number; limit: number; total: number; totalPages: number } {
  if (Array.isArray(raw)) {
    return { list: raw as T[], page: 1, limit: raw.length, total: raw.length, totalPages: 1 };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const key of keys) {
      const v = o[key];
      if (Array.isArray(v)) {
        return {
          list: v as T[],
          page: typeof o.page === 'number' ? o.page : 1,
          limit: typeof o.limit === 'number' ? o.limit : v.length,
          total: typeof o.total === 'number' ? o.total : v.length,
          totalPages: typeof o.totalPages === 'number' && o.totalPages > 0 ? o.totalPages : 1,
        };
      }
    }
  }
  return { list: [], page: 1, limit: 50, total: 0, totalPages: 1 };
}

export async function fetchWarehousesMeta(): Promise<WarehousesMeta> {
  const res = await fetch(apiUrl('/api/warehouses/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<WarehousesMeta>;
  return {
    statuses:
      Array.isArray(data.statuses) && data.statuses.length > 0
        ? (data.statuses as WarehouseStatus[])
        : DEFAULT_WAREHOUSES_META.statuses,
    locationTypes:
      Array.isArray(data.locationTypes) && data.locationTypes.length > 0
        ? (data.locationTypes as LocationType[])
        : DEFAULT_WAREHOUSES_META.locationTypes,
    storableTypes:
      Array.isArray(data.storableTypes) && data.storableTypes.length > 0
        ? (data.storableTypes as LocationType[])
        : DEFAULT_WAREHOUSES_META.storableTypes,
    allowedParents:
      data.allowedParents && typeof data.allowedParents === 'object'
        ? data.allowedParents
        : DEFAULT_WAREHOUSES_META.allowedParents,
    parentTypeByChild:
      data.parentTypeByChild && typeof data.parentTypeByChild === 'object'
        ? data.parentTypeByChild
        : DEFAULT_WAREHOUSES_META.parentTypeByChild,
    layoutPresets:
      Array.isArray(data.layoutPresets) && data.layoutPresets.length > 0
        ? data.layoutPresets
        : DEFAULT_WAREHOUSES_META.layoutPresets,
    recommended: data.recommended ?? DEFAULT_WAREHOUSES_META.recommended,
  };
}

export async function fetchWarehouses(
  params: WarehousesListParams = {}
): Promise<PaginatedResult<Warehouse>> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 100));
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.status) query.set('status', params.status);

  const res = await fetch(apiUrl(`/api/warehouses?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const { list, page, limit, total, totalPages } = extractList<ApiWarehouse>(await res.json(), [
    'items',
    'warehouses',
    'data',
    'results',
  ]);
  return {
    items: list.map(mapApiWarehouse),
    page,
    limit,
    total,
    totalPages,
  };
}

/** Fetch all warehouse pages into a flat list. */
export async function fetchAllWarehouses(
  params: Omit<WarehousesListParams, 'page'> = {}
): Promise<Warehouse[]> {
  const all: Warehouse[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await fetchWarehouses({ ...params, page, limit: params.limit ?? 100 });
    all.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

export async function fetchWarehouseById(id: string): Promise<Warehouse> {
  const res = await fetch(warehouseResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiWarehouse((await res.json()) as ApiWarehouse);
}

export async function createWarehouse(
  payload: CreateWarehousePayload
): Promise<Warehouse> {
  const body: Record<string, unknown> = {
    code: payload.code.trim(),
    name: payload.name.trim(),
    status: payload.status ?? 'active',
    isDefault: Boolean(payload.isDefault),
  };
  if (payload.description?.trim()) body.description = payload.description.trim();
  if (payload.address?.trim()) body.address = payload.address.trim();
  if (payload.city?.trim()) body.city = payload.city.trim();
  if (payload.phone?.trim()) body.phone = payload.phone.trim();
  if (payload.managerId !== undefined && payload.managerId !== null && payload.managerId !== '') {
    body.managerId = payload.managerId;
  }

  const res = await fetch(apiUrl('/api/warehouses'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiWarehouse((await res.json()) as ApiWarehouse);
}

export async function updateWarehouse(
  id: string,
  payload: UpdateWarehousePayload
): Promise<Warehouse> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.code = payload.code.trim();
  if (payload.name !== undefined) body.name = payload.name.trim();
  if (payload.description !== undefined) body.description = payload.description.trim();
  if (payload.address !== undefined) body.address = payload.address.trim();
  if (payload.city !== undefined) body.city = payload.city.trim();
  if (payload.phone !== undefined) body.phone = payload.phone.trim();
  if (payload.isDefault !== undefined) body.isDefault = payload.isDefault;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.managerId !== undefined) {
    body.managerId = payload.managerId || null;
  }

  if (Object.keys(body).length === 0) {
    throw new Error('No warehouse fields to update');
  }

  const res = await fetch(warehouseResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiWarehouse((await res.json()) as ApiWarehouse);
}

export async function deleteWarehouse(id: string): Promise<void> {
  const res = await fetch(warehouseResourceUrl(id), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function fetchWarehouseLocations(
  warehouseId: string
): Promise<{ warehouse: Warehouse; items: StorageLocation[] }> {
  const res = await fetch(`${warehouseResourceUrl(warehouseId)}/locations`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    warehouse?: ApiWarehouse;
    items?: ApiStorageLocation[];
  };
  return {
    warehouse: data.warehouse
      ? mapApiWarehouse(data.warehouse)
      : ({ id: warehouseId } as Warehouse),
    items: (data.items ?? []).map(mapApiLocation),
  };
}

export async function createWarehouseLocation(
  warehouseId: string,
  payload: CreateLocationPayload
): Promise<StorageLocation> {
  const body: Record<string, unknown> = {
    type: payload.type,
    code: payload.code.trim(),
    name: payload.name.trim(),
  };
  if (payload.description?.trim()) body.description = payload.description.trim();
  if (payload.parentId) body.parentId = payload.parentId;

  const res = await fetch(`${warehouseResourceUrl(warehouseId)}/locations`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiLocation((await res.json()) as ApiStorageLocation);
}

export async function updateWarehouseLocation(
  warehouseId: string,
  locationId: string,
  payload: UpdateLocationPayload
): Promise<StorageLocation> {
  const body: Record<string, unknown> = {};
  if (payload.code !== undefined) body.code = payload.code.trim();
  if (payload.name !== undefined) body.name = payload.name.trim();
  if (payload.description !== undefined) body.description = payload.description.trim();
  if (payload.parentId !== undefined) body.parentId = payload.parentId;
  if (payload.isActive !== undefined) body.isActive = payload.isActive;

  if (Object.keys(body).length === 0) {
    throw new Error('No location fields to update');
  }

  const res = await fetch(locationResourceUrl(warehouseId, locationId), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiLocation((await res.json()) as ApiStorageLocation);
}

export async function deleteWarehouseLocation(
  warehouseId: string,
  locationId: string
): Promise<void> {
  const res = await fetch(locationResourceUrl(warehouseId, locationId), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}

export async function fetchWarehouseStructure(warehouseId: string): Promise<{
  warehouse: Warehouse;
  structure: LocationNode[];
  flat: StorageLocation[];
}> {
  const res = await fetch(`${warehouseResourceUrl(warehouseId)}/structure`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    warehouse: ApiWarehouse;
    structure?: ApiStorageLocation[];
    flat?: ApiStorageLocation[];
  };
  const warehouse = mapApiWarehouse(data.warehouse);
  let structure = (data.structure ?? []).map(mapLocationNode);
  const hasMissingPath = (nodes: LocationNode[]): boolean => {
    for (const n of nodes) {
      if (!n.fullPath) return true;
      if (n.children.length && hasMissingPath(n.children)) return true;
    }
    return false;
  };
  if (hasMissingPath(structure) && warehouse.code) {
    structure = buildLocationFullPath(structure, warehouse.code);
  }
  const flattenNodes = (nodes: LocationNode[]): StorageLocation[] => {
    const out: StorageLocation[] = [];
    const walk = (list: LocationNode[]) => {
      for (const n of list) {
        const { children: _, ...rest } = n;
        out.push(rest);
        if (n.children.length) walk(n.children);
      }
    };
    walk(nodes);
    return out;
  };
  const flat =
    data.flat && data.flat.length > 0 && !hasMissingPath(structure)
      ? data.flat.map(mapApiLocation)
      : flattenNodes(structure);
  return {
    warehouse,
    structure,
    flat,
  };
}

export async function fetchWarehouseInventory(
  warehouseId: string,
  params: { page?: number; limit?: number; q?: string; inStock?: boolean } = {}
): Promise<PaginatedResult<WarehouseInventoryItem> & { warehouse: Warehouse }> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.inStock) query.set('inStock', 'true');

  const res = await fetch(
    `${warehouseResourceUrl(warehouseId)}/inventory?${query.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = await res.json();
  const { list, page, limit, total, totalPages } = extractList<ApiWarehouseStock>(raw, [
    'items',
    'data',
    'results',
  ]);
  const warehouse =
    raw && typeof raw === 'object' && 'warehouse' in raw && raw.warehouse
      ? mapApiWarehouse(raw.warehouse as ApiWarehouse)
      : ({ id: warehouseId } as Warehouse);
  return {
    warehouse,
    items: list.map(mapApiInventoryItem),
    page,
    limit,
    total,
    totalPages,
  };
}

export async function fetchWarehouseHistory(
  warehouseId: string,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResult<WarehouseHistoryItem> & { warehouse: Warehouse }> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 50));

  const res = await fetch(
    `${warehouseResourceUrl(warehouseId)}/history?${query.toString()}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error(await readApiError(res));
  const raw = await res.json();
  const { list, page, limit, total, totalPages } = extractList<ApiStockMovement>(raw, [
    'items',
    'data',
    'results',
  ]);
  const warehouse =
    raw && typeof raw === 'object' && 'warehouse' in raw && raw.warehouse
      ? mapApiWarehouse(raw.warehouse as ApiWarehouse)
      : ({ id: warehouseId } as Warehouse);
  return {
    warehouse,
    items: list.map(mapApiHistoryItem),
    page,
    limit,
    total,
    totalPages,
  };
}

export async function assignProductLocation(
  warehouseId: string,
  payload: AssignLocationPayload
): Promise<WarehouseInventoryItem> {
  const res = await fetch(`${warehouseResourceUrl(warehouseId)}/assign-location`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      productId: payload.productId,
      locationId: payload.locationId,
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiInventoryItem((await res.json()) as ApiWarehouseStock);
}

/** Clear the bin assignment for a product in this warehouse. */
export async function clearProductLocation(
  warehouseId: string,
  productId: string
): Promise<WarehouseInventoryItem> {
  return assignProductLocation(warehouseId, { productId, locationId: null });
}

export function findLocationNode(
  nodes: LocationNode[],
  id: string
): LocationNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findLocationNode(n.children, id);
    if (found) return found;
  }
  return null;
}

export function storableLocationsFromStructure(
  nodes: LocationNode[],
  storableTypes: LocationType[] = ['bin']
): LocationNode[] {
  const allowed = new Set(storableTypes);
  const out: LocationNode[] = [];
  const walk = (list: LocationNode[]) => {
    for (const n of list) {
      if (allowed.has(n.type) && n.isActive) out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

export function suggestLocationCode(type: LocationType, name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w.slice(0, 4))
    .join('-');
  if (!base) {
    return type === 'zone' ? 'ZONE' : type === 'bin' ? 'BIN' : type.toUpperCase().slice(0, 4);
  }
  return base;
}

export function binsFromStructure(nodes: LocationNode[]): LocationNode[] {
  const bins: LocationNode[] = [];
  const walk = (list: LocationNode[]) => {
    for (const n of list) {
      if (n.type === 'bin') bins.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(nodes);
  return bins;
}

export function formatMovementType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
