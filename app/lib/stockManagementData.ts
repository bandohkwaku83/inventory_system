/** Warehouse & stock management — frontend dummy data until API is ready. */

export type StockMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'adjustment'
  | 'opening'
  | 'damaged'
  | 'returned'
  | 'transfer';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  region: string;
  phone: string;
  email: string;
  managerName: string;
  description?: string;
  status: 'active' | 'inactive';
  totalProducts: number;
  totalStockQty: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export type StorageLocationType = 'shelf' | 'room' | 'rack' | 'zone';

export interface StorageLocation {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: StorageLocationType;
  group: string;
  capacity: number;
  occupied: number;
  status: 'available' | 'full' | 'maintenance';
}

export interface ProductLocationAssignment {
  id: string;
  warehouseId: string;
  storageLocationId: string;
  productName: string;
  sku: string;
  quantity: number;
}

export type TransferWorkflowStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'in_transit'
  | 'received'
  | 'cancelled';

export interface WarehouseTransfer {
  id: string;
  reference: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  reason: string;
  status: TransferWorkflowStatus;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
}

export type WarehouseHistoryType =
  | 'received'
  | 'transferred'
  | 'adjusted'
  | 'dispatched'
  | 'transfer_in'
  | 'transfer_out';

export interface WarehouseHistoryEntry {
  id: string;
  warehouseId: string;
  type: WarehouseHistoryType;
  description: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  reference?: string;
  createdBy: string;
  createdAt: string;
}

export type StockInSource = 'purchase' | 'donation' | 'returned_goods' | 'initial_stock';
export type StockOutReason = 'sale' | 'damage' | 'internal_use' | 'transfer' | 'expired';
export type ReturnCondition = 'good' | 'damaged';

export interface StockMovement {
  id: string;
  reference: string;
  type: StockMovementType;
  warehouseId: string;
  storageLocationId?: string;
  productName: string;
  sku: string;
  quantity: number;
  previousQty?: number;
  newQty?: number;
  unit: string;
  reason?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'cancelled';
  toWarehouseId?: string;
  /** Display label in movement history */
  transactionLabel?: string;
  stockInSource?: StockInSource;
  stockOutReason?: StockOutReason;
  supplier?: string;
  customer?: string;
  unitCost?: number;
  systemStock?: number;
  physicalCount?: number;
  returnCondition?: ReturnCondition;
  openingDate?: string;
  qtyIn?: number;
  qtyOut?: number;
  ledgerBalance?: number;
}

export interface StockAvailability {
  sku: string;
  productName: string;
  warehouseId: string;
  available: number;
  reserved: number;
  damaged: number;
  onOrder: number;
  minimumLevel: number;
}

export interface StockLedgerEntry {
  id: string;
  sku: string;
  productName: string;
  warehouseId: string;
  date: string;
  transaction: string;
  qtyIn: number | null;
  qtyOut: number | null;
  balance: number;
}

export const STOCK_IN_SOURCES: Record<StockInSource, string> = {
  purchase: 'Purchase',
  donation: 'Donation',
  returned_goods: 'Returned goods',
  initial_stock: 'Initial stock',
};

export const STOCK_OUT_REASONS: Record<StockOutReason, string> = {
  sale: 'Sale',
  damage: 'Damage',
  internal_use: 'Internal use',
  transfer: 'Transfer',
  expired: 'Expired products',
};

export const WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-001',
    code: 'WH001',
    name: 'Main Warehouse',
    address: '14 Independence Ave, Ridge',
    city: 'Accra',
    region: 'Greater Accra',
    phone: '+233 30 222 1100',
    email: 'main.wh@onyxbuild.gh',
    managerName: 'John Doe',
    description: 'Primary distribution hub for Greater Accra region',
    status: 'active',
    totalProducts: 1520,
    totalStockQty: 28400,
    inventoryValue: 950000,
    lowStockCount: 15,
    outOfStockCount: 3,
  },
  {
    id: 'wh-002',
    code: 'WH002',
    name: 'Kumasi Branch',
    address: '45 Harper Road, Adum',
    city: 'Kumasi',
    region: 'Ashanti',
    phone: '+233 32 202 4400',
    email: 'kumasi@onyxbuild.gh',
    managerName: 'Mary Smith',
    description: 'Ashanti regional branch and retail store',
    status: 'active',
    totalProducts: 892,
    totalStockQty: 15600,
    inventoryValue: 318200,
    lowStockCount: 8,
    outOfStockCount: 1,
  },
  {
    id: 'wh-003',
    code: 'WH003',
    name: 'Tema Industrial Warehouse',
    address: 'Industrial Area, Plot 7',
    city: 'Tema',
    region: 'Greater Accra',
    phone: '+233 30 320 8800',
    email: 'tema.wh@onyxbuild.gh',
    managerName: 'Kofi Mensah',
    description: 'Bulk storage for cement, steel, and building materials',
    status: 'active',
    totalProducts: 2104,
    totalStockQty: 48200,
    inventoryValue: 724800,
    lowStockCount: 24,
    outOfStockCount: 5,
  },
  {
    id: 'wh-004',
    code: 'WH004',
    name: 'Takoradi Showroom',
    address: '8 Market Circle',
    city: 'Takoradi',
    region: 'Western',
    phone: '+233 31 202 3300',
    email: 'takoradi@onyxbuild.gh',
    managerName: 'Efua Boateng',
    status: 'active',
    totalProducts: 456,
    totalStockQty: 4200,
    inventoryValue: 168400,
    lowStockCount: 5,
    outOfStockCount: 0,
  },
];

export const STORAGE_LOCATIONS: StorageLocation[] = [
  { id: 'sl-001', warehouseId: 'wh-001', code: 'SH-A', name: 'Shelf A', type: 'shelf', group: 'Shelves', capacity: 200, occupied: 168, status: 'available' },
  { id: 'sl-002', warehouseId: 'wh-001', code: 'SH-B', name: 'Shelf B', type: 'shelf', group: 'Shelves', capacity: 200, occupied: 142, status: 'available' },
  { id: 'sl-003', warehouseId: 'wh-001', code: 'SH-C', name: 'Shelf C', type: 'shelf', group: 'Shelves', capacity: 200, occupied: 198, status: 'full' },
  { id: 'sl-004', warehouseId: 'wh-001', code: 'RM-1', name: 'Room 1', type: 'room', group: 'Rooms', capacity: 500, occupied: 320, status: 'available' },
  { id: 'sl-005', warehouseId: 'wh-001', code: 'RM-2', name: 'Room 2', type: 'room', group: 'Rooms', capacity: 500, occupied: 410, status: 'available' },
  { id: 'sl-006', warehouseId: 'wh-001', code: 'RK-A01', name: 'Rack A01', type: 'rack', group: 'Racks', capacity: 80, occupied: 62, status: 'available' },
  { id: 'sl-007', warehouseId: 'wh-001', code: 'RK-A02', name: 'Rack A02', type: 'rack', group: 'Racks', capacity: 80, occupied: 55, status: 'available' },
  { id: 'sl-008', warehouseId: 'wh-001', code: 'RK-A03', name: 'Rack A03', type: 'rack', group: 'Racks', capacity: 80, occupied: 48, status: 'available' },
  { id: 'sl-009', warehouseId: 'wh-001', code: 'RK-B01', name: 'Rack B01', type: 'rack', group: 'Racks', capacity: 80, occupied: 80, status: 'full' },
  { id: 'sl-010', warehouseId: 'wh-002', code: 'KS-A01', name: 'Main Aisle A1', type: 'zone', group: 'Main Floor', capacity: 100, occupied: 72, status: 'available' },
  { id: 'sl-011', warehouseId: 'wh-003', code: 'TM-A01', name: 'Cement Bay A1', type: 'zone', group: 'Bulk Storage', capacity: 500, occupied: 420, status: 'available' },
];

export const PRODUCT_LOCATION_ASSIGNMENTS: ProductLocationAssignment[] = [
  { id: 'pla-001', warehouseId: 'wh-001', storageLocationId: 'sl-008', productName: 'Dell Mouse', sku: 'DL-MSE-01', quantity: 120 },
  { id: 'pla-002', warehouseId: 'wh-001', storageLocationId: 'sl-006', productName: 'HP Laptop 15"', sku: 'HP-LP-15', quantity: 45 },
  { id: 'pla-003', warehouseId: 'wh-001', storageLocationId: 'sl-004', productName: 'Mechanical Keyboard', sku: 'KB-MCH-01', quantity: 80 },
  { id: 'pla-004', warehouseId: 'wh-001', storageLocationId: 'sl-001', productName: 'USB-C Hub', sku: 'USB-HUB-C', quantity: 200 },
  { id: 'pla-005', warehouseId: 'wh-002', storageLocationId: 'sl-010', productName: 'Portland Cement 50kg', sku: 'CEM-50', quantity: 380 },
];

export const WAREHOUSE_TRANSFERS: WarehouseTransfer[] = [
  {
    id: 'wt-001',
    reference: 'TRF-2026-0088',
    fromWarehouseId: 'wh-001',
    toWarehouseId: 'wh-002',
    productName: 'Dell Mouse',
    sku: 'DL-MSE-01',
    quantity: 50,
    unit: 'pcs',
    reason: 'Restocking branch',
    status: 'pending_approval',
    createdBy: 'John Doe',
    createdAt: '2026-07-12T08:30:00',
  },
  {
    id: 'wt-002',
    reference: 'TRF-2026-0087',
    fromWarehouseId: 'wh-003',
    toWarehouseId: 'wh-001',
    productName: 'Portland Cement 50kg',
    sku: 'CEM-50',
    quantity: 200,
    unit: 'bags',
    reason: 'Urgent restock for weekend sales',
    status: 'in_transit',
    createdBy: 'Kofi Mensah',
    createdAt: '2026-07-10T09:30:00',
    approvedBy: 'John Doe',
    approvedAt: '2026-07-10T10:00:00',
  },
  {
    id: 'wt-003',
    reference: 'TRF-2026-0086',
    fromWarehouseId: 'wh-001',
    toWarehouseId: 'wh-002',
    productName: 'Mechanical Keyboard',
    sku: 'KB-MCH-01',
    quantity: 30,
    unit: 'pcs',
    reason: 'Branch inventory replenishment',
    status: 'received',
    createdBy: 'John Doe',
    createdAt: '2026-07-08T14:00:00',
    approvedBy: 'John Doe',
    approvedAt: '2026-07-08T14:15:00',
    receivedBy: 'Mary Smith',
    receivedAt: '2026-07-09T09:00:00',
  },
  {
    id: 'wt-004',
    reference: 'TRF-2026-0085',
    fromWarehouseId: 'wh-002',
    toWarehouseId: 'wh-004',
    productName: 'PVC Pipes 4"',
    sku: 'PVC-04',
    quantity: 60,
    unit: 'pcs',
    reason: 'Showroom display stock',
    status: 'draft',
    createdBy: 'Mary Smith',
    createdAt: '2026-07-11T11:00:00',
  },
];

export const WAREHOUSE_HISTORY: WarehouseHistoryEntry[] = [
  {
    id: 'wh-h-001', warehouseId: 'wh-001', type: 'received',
    description: 'Received 100 HP Laptops', productName: 'HP Laptop 15"', quantity: 100, unit: 'pcs',
    reference: 'SI-2026-1842', createdBy: 'John Doe', createdAt: '2026-07-12T09:00:00',
  },
  {
    id: 'wh-h-002', warehouseId: 'wh-001', type: 'transferred',
    description: 'Transferred 50 Keyboards to Kumasi Branch', productName: 'Mechanical Keyboard', quantity: 50, unit: 'pcs',
    reference: 'TRF-2026-0086', createdBy: 'John Doe', createdAt: '2026-07-12T08:45:00',
  },
  {
    id: 'wh-h-003', warehouseId: 'wh-001', type: 'adjusted',
    description: 'Adjusted +5 Monitors after cycle count', productName: 'Dell Monitor 24"', quantity: 5, unit: 'pcs',
    reference: 'ADJ-2026-0045', createdBy: 'John Doe', createdAt: '2026-07-12T08:20:00',
  },
  {
    id: 'wh-h-004', warehouseId: 'wh-001', type: 'dispatched',
    description: 'Dispatched 24 Iron Rods for POS sale', productName: 'Iron Rods 12mm', quantity: 24, unit: 'pcs',
    reference: 'SO-2026-0921', createdBy: 'Yaw Darko', createdAt: '2026-07-11T11:42:00',
  },
  {
    id: 'wh-h-005', warehouseId: 'wh-002', type: 'transfer_in',
    description: 'Received 30 Keyboards from Main Warehouse', productName: 'Mechanical Keyboard', quantity: 30, unit: 'pcs',
    reference: 'TRF-2026-0086', createdBy: 'Mary Smith', createdAt: '2026-07-09T09:00:00',
  },
  {
    id: 'wh-h-006', warehouseId: 'wh-003', type: 'transfer_out',
    description: 'Transferred 200 bags cement to Main Warehouse', productName: 'Portland Cement 50kg', quantity: 200, unit: 'bags',
    reference: 'TRF-2026-0087', createdBy: 'Kofi Mensah', createdAt: '2026-07-10T10:00:00',
  },
];

export const STOCK_AVAILABILITY: StockAvailability[] = [
  { sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-001', available: 120, reserved: 15, damaged: 3, onOrder: 40, minimumLevel: 20 },
  { sku: 'DL-LP-14', productName: 'Dell Laptop', warehouseId: 'wh-001', available: 50, reserved: 5, damaged: 0, onOrder: 20, minimumLevel: 15 },
  { sku: 'MON-24', productName: 'Monitor', warehouseId: 'wh-001', available: 96, reserved: 8, damaged: 4, onOrder: 0, minimumLevel: 25 },
  { sku: 'PRT-INK', productName: 'Printer', warehouseId: 'wh-001', available: 28, reserved: 2, damaged: 1, onOrder: 10, minimumLevel: 10 },
  { sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-002', available: 18, reserved: 0, damaged: 0, onOrder: 30, minimumLevel: 20 },
  { sku: 'CEM-50', productName: 'Portland Cement 50kg', warehouseId: 'wh-003', available: 420, reserved: 50, damaged: 12, onOrder: 200, minimumLevel: 100 },
];

export const STOCK_LEDGER: StockLedgerEntry[] = [
  { id: 'lg-1', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-001', date: '2026-07-01', transaction: 'Opening Stock', qtyIn: 100, qtyOut: null, balance: 100 },
  { id: 'lg-2', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-001', date: '2026-07-05', transaction: 'Purchase', qtyIn: 50, qtyOut: null, balance: 150 },
  { id: 'lg-3', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-001', date: '2026-07-08', transaction: 'Sale', qtyIn: null, qtyOut: 10, balance: 140 },
  { id: 'lg-4', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-001', date: '2026-07-10', transaction: 'Transfer', qtyIn: null, qtyOut: 20, balance: 120 },
  { id: 'lg-5', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-001', date: '2026-07-12', transaction: 'Adjustment', qtyIn: 5, qtyOut: null, balance: 125 },
  { id: 'lg-6', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-002', date: '2026-07-10', transaction: 'Transfer Received', qtyIn: 20, qtyOut: null, balance: 20 },
  { id: 'lg-7', sku: 'HP-LP-15', productName: 'HP Laptop', warehouseId: 'wh-002', date: '2026-07-12', transaction: 'Sale', qtyIn: null, qtyOut: 2, balance: 18 },
];

export const STOCK_MOVEMENTS: StockMovement[] = [
  {
    id: 'sm-001', reference: 'SI-2026-1842', type: 'stock_in', warehouseId: 'wh-001',
    productName: 'HP Laptop', sku: 'HP-LP-15', quantity: 100, previousQty: 50, newQty: 150,
    unit: 'pcs', stockInSource: 'purchase', supplier: 'ABC Computers', unitCost: 5000,
    transactionLabel: 'Stock In', reason: 'Purchase from ABC Computers',
    createdBy: 'Admin', createdAt: '2026-07-12T09:00:00', status: 'completed', qtyIn: 100,
  },
  {
    id: 'sm-002', reference: 'SO-2026-0921', type: 'stock_out', warehouseId: 'wh-001',
    productName: 'HP Laptop', sku: 'HP-LP-15', quantity: 5, previousQty: 150, newQty: 145,
    unit: 'pcs', stockOutReason: 'sale', transactionLabel: 'Sale', reason: 'Customer Sale',
    createdBy: 'Cashier', createdAt: '2026-07-13T11:00:00', status: 'completed', qtyOut: 5,
  },
  {
    id: 'sm-003', reference: 'SO-2026-0920', type: 'stock_out', warehouseId: 'wh-001',
    productName: 'HP Laptop', sku: 'HP-LP-15', quantity: 20, previousQty: 145, newQty: 125,
    unit: 'pcs', stockOutReason: 'transfer', transactionLabel: 'Transfer', reason: 'Transfer to Kumasi Branch',
    toWarehouseId: 'wh-002', createdBy: 'Manager', createdAt: '2026-07-14T10:00:00', status: 'completed', qtyOut: 20,
  },
  {
    id: 'sm-004', reference: 'SI-2026-1843', type: 'stock_in', warehouseId: 'wh-002',
    productName: 'HP Laptop', sku: 'HP-LP-15', quantity: 20, previousQty: 0, newQty: 20,
    unit: 'pcs', stockInSource: 'returned_goods', transactionLabel: 'Transfer Received',
    reason: 'Received from Main Warehouse', createdBy: 'Manager', createdAt: '2026-07-14T14:00:00',
    status: 'completed', qtyIn: 20,
  },
  {
    id: 'sm-005', reference: 'ADJ-2026-0044', type: 'adjustment', warehouseId: 'wh-001',
    productName: 'Monitor', sku: 'MON-24', quantity: -3, previousQty: 100, newQty: 97,
    systemStock: 100, physicalCount: 97, unit: 'pcs', transactionLabel: 'Adjustment',
    reason: 'Damaged during storage', createdBy: 'Admin', createdAt: '2026-07-10T14:00:00', status: 'completed',
  },
  {
    id: 'sm-006', reference: 'ADJ-2026-0045', type: 'adjustment', warehouseId: 'wh-001',
    productName: 'HP Laptop', sku: 'HP-LP-15', quantity: 5, previousQty: 120, newQty: 125,
    systemStock: 120, physicalCount: 125, unit: 'pcs', transactionLabel: 'Adjustment',
    reason: 'Previous receiving error', createdBy: 'Admin', createdAt: '2026-07-12T08:20:00', status: 'completed', qtyIn: 5,
  },
  {
    id: 'sm-007', reference: 'OPN-2026-0001', type: 'opening', warehouseId: 'wh-001',
    productName: 'Dell Laptop', sku: 'DL-LP-14', quantity: 50, newQty: 50, unit: 'pcs',
    unitCost: 4500, openingDate: '2026-01-01', transactionLabel: 'Opening Stock',
    reason: 'Initial inventory setup', createdBy: 'Admin', createdAt: '2026-01-01T08:00:00', status: 'completed', qtyIn: 50,
  },
  {
    id: 'sm-008', reference: 'DMG-2026-0018', type: 'damaged', warehouseId: 'wh-001',
    productName: 'Monitor', sku: 'MON-24', quantity: 4, previousQty: 100, newQty: 96,
    unit: 'pcs', transactionLabel: 'Damaged Stock', reason: 'Water damage in storage',
    createdBy: 'John Doe', createdAt: '2026-07-09T16:20:00', status: 'completed', qtyOut: 4,
  },
  {
    id: 'sm-009', reference: 'RET-2026-0033', type: 'returned', warehouseId: 'wh-001',
    productName: 'Printer', sku: 'PRT-INK', quantity: 2, previousQty: 26, newQty: 28,
    unit: 'pcs', customer: 'James', returnCondition: 'good', transactionLabel: 'Returned Stock',
    reason: 'Wrong item', createdBy: 'Cashier', createdAt: '2026-07-08T10:15:00', status: 'completed', qtyIn: 2,
  },
  {
    id: 'sm-010', reference: 'RET-2026-0034', type: 'returned', warehouseId: 'wh-001',
    productName: 'USB-C Hub', sku: 'USB-HUB-C', quantity: 1, previousQty: 200, newQty: 200,
    unit: 'pcs', customer: 'Metro Mart', returnCondition: 'damaged', transactionLabel: 'Returned → Damaged',
    reason: 'Packaging crushed', createdBy: 'Cashier', createdAt: '2026-07-07T15:00:00', status: 'completed',
  },
];

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  stock_in: 'Stock In',
  stock_out: 'Stock Out',
  adjustment: 'Adjustment',
  opening: 'Opening Stock',
  damaged: 'Damaged Stock',
  returned: 'Returned Stock',
  transfer: 'Transfer',
};

export const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  stock_in: 'green',
  stock_out: 'orange',
  adjustment: 'blue',
  opening: 'purple',
  damaged: 'red',
  returned: 'cyan',
  transfer: 'geekblue',
};

export const STORAGE_TYPE_LABELS: Record<StorageLocationType, string> = {
  shelf: 'Shelf',
  room: 'Room',
  rack: 'Rack',
  zone: 'Zone',
};

export const TRANSFER_STATUS_LABELS: Record<TransferWorkflowStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  in_transit: 'In transit',
  received: 'Received',
  cancelled: 'Cancelled',
};

export const TRANSFER_STATUS_COLORS: Record<TransferWorkflowStatus, string> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'processing',
  in_transit: 'blue',
  received: 'success',
  cancelled: 'error',
};

export const HISTORY_TYPE_LABELS: Record<WarehouseHistoryType, string> = {
  received: 'Received',
  transferred: 'Transferred',
  adjusted: 'Adjusted',
  dispatched: 'Dispatched',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
};

export const HISTORY_TYPE_COLORS: Record<WarehouseHistoryType, string> = {
  received: 'green',
  transferred: 'geekblue',
  adjusted: 'blue',
  dispatched: 'orange',
  transfer_in: 'cyan',
  transfer_out: 'purple',
};

export function warehouseName(id: string): string {
  return WAREHOUSES.find((w) => w.id === id)?.name ?? id;
}

export function storageLocationLabel(id: string): string {
  const sl = STORAGE_LOCATIONS.find((s) => s.id === id);
  return sl ? `${sl.code} — ${sl.name}` : id;
}

export function formatStockCurrency(amount: number): string {
  return `GH₵${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function nextWarehouseCode(existing: Warehouse[]): string {
  const nums = existing
    .map((w) => parseInt(w.code.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `WH${String(next).padStart(3, '0')}`;
}

export function nextTransferReference(count: number): string {
  return `TRF-2026-${String(count + 1).padStart(4, '0')}`;
}

export function nextMovementReference(type: StockMovementType, count: number): string {
  const prefixes: Record<StockMovementType, string> = {
    stock_in: 'SI',
    stock_out: 'SO',
    adjustment: 'ADJ',
    opening: 'OPN',
    damaged: 'DMG',
    returned: 'RET',
    transfer: 'TRF',
  };
  return `${prefixes[type]}-2026-${String(count + 1).padStart(4, '0')}`;
}

export function formatHistoryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
