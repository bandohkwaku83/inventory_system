/** Frontend-only enterprise data — replace with API calls when backend is ready. */

export type LocationType = 'headquarters' | 'branch' | 'warehouse' | 'showroom';

export interface BusinessLocation {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  city: string;
  region: string;
  address: string;
  phone: string;
  manager: string;
  status: 'active' | 'inactive';
  skuCount: number;
  stockValue: number;
  monthlyRevenue: number;
  staffCount: number;
  lowStockCount: number;
}

export type CustomerType = 'retail' | 'wholesale' | 'corporate' | 'government';
export type CustomerStatus = 'active' | 'inactive' | 'on_hold';

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  status: CustomerStatus;
  email: string;
  phone: string;
  city: string;
  tin?: string;
  creditLimit: number;
  balance: number;
  totalPurchases: number;
  lastPurchaseDate: string;
  assignedRep: string;
  locationId: string;
  tags: string[];
}

export type TransferStatus = 'draft' | 'in_transit' | 'received' | 'cancelled';

export interface StockTransferLine {
  productName: string;
  sku: string;
  quantity: number;
}

export interface StockTransfer {
  id: string;
  reference: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  createdAt: string;
  expectedDate: string;
  createdBy: string;
  lines: StockTransferLine[];
  notes?: string;
}

export type ApprovalType = 'purchase' | 'expense' | 'transfer' | 'discount' | 'credit';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  status: ApprovalStatus;
  title: string;
  description: string;
  amount: number;
  requestedBy: string;
  requestedAt: string;
  locationId: string;
  priority: 'low' | 'medium' | 'high';
}

export type NotificationType = 'low_stock' | 'approval' | 'transfer' | 'payment' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
  priority: 'low' | 'medium' | 'high';
}

export type ActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'login'
  | 'export'
  | 'transfer';

export interface ActivityEntry {
  id: string;
  action: ActivityAction;
  entity: string;
  entityId: string;
  description: string;
  user: string;
  userRole: string;
  locationId?: string;
  timestamp: string;
  ip?: string;
}

export interface GlobalSearchResult {
  id: string;
  type: 'product' | 'customer' | 'receipt' | 'supplier' | 'staff' | 'page';
  title: string;
  subtitle: string;
  href: string;
}

export const BUSINESS_LOCATIONS: BusinessLocation[] = [
  {
    id: 'loc-hq',
    name: 'Head Office — Accra',
    code: 'HQ-ACC',
    type: 'headquarters',
    city: 'Accra',
    region: 'Greater Accra',
    address: '14 Independence Ave, Ridge',
    phone: '+233 30 222 1100',
    manager: 'Kwame Asante',
    status: 'active',
    skuCount: 1248,
    stockValue: 482500,
    monthlyRevenue: 186400,
    staffCount: 28,
    lowStockCount: 12,
  },
  {
    id: 'loc-kumasi',
    name: 'Kumasi Branch',
    code: 'BR-KSI',
    type: 'branch',
    city: 'Kumasi',
    region: 'Ashanti',
    address: '45 Harper Road, Adum',
    phone: '+233 32 202 4400',
    manager: 'Ama Osei',
    status: 'active',
    skuCount: 892,
    stockValue: 318200,
    monthlyRevenue: 142800,
    staffCount: 16,
    lowStockCount: 8,
  },
  {
    id: 'loc-tema',
    name: 'Tema Warehouse',
    code: 'WH-TMA',
    type: 'warehouse',
    city: 'Tema',
    region: 'Greater Accra',
    address: 'Industrial Area, Plot 7',
    phone: '+233 30 320 8800',
    manager: 'Kofi Mensah',
    status: 'active',
    skuCount: 2104,
    stockValue: 724800,
    monthlyRevenue: 0,
    staffCount: 12,
    lowStockCount: 24,
  },
  {
    id: 'loc-takoradi',
    name: 'Takoradi Showroom',
    code: 'SH-TKD',
    type: 'showroom',
    city: 'Takoradi',
    region: 'Western',
    address: '8 Market Circle',
    phone: '+233 31 202 3300',
    manager: 'Efua Boateng',
    status: 'active',
    skuCount: 456,
    stockValue: 168400,
    monthlyRevenue: 98400,
    staffCount: 8,
    lowStockCount: 5,
  },
  {
    id: 'loc-tamale',
    name: 'Tamale Branch',
    code: 'BR-TML',
    type: 'branch',
    city: 'Tamale',
    region: 'Northern',
    address: '22 Central Road',
    phone: '+233 37 202 2200',
    manager: 'Ibrahim Yakubu',
    status: 'inactive',
    skuCount: 312,
    stockValue: 94200,
    monthlyRevenue: 42800,
    staffCount: 6,
    lowStockCount: 18,
  },
];

export const CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    name: 'Golden Star Construction Ltd',
    type: 'corporate',
    status: 'active',
    email: 'procurement@goldenstar.gh',
    phone: '+233 24 412 8800',
    city: 'Accra',
    tin: 'C0001234567',
    creditLimit: 50000,
    balance: 12400,
    totalPurchases: 284500,
    lastPurchaseDate: '2026-07-10',
    assignedRep: 'Yaw Darko',
    locationId: 'loc-hq',
    tags: ['VIP', 'Net-30'],
  },
  {
    id: 'cust-002',
    name: 'Metro Mart Retail Chain',
    type: 'wholesale',
    status: 'active',
    email: 'orders@metromart.gh',
    phone: '+233 20 998 4400',
    city: 'Kumasi',
    tin: 'C0002345678',
    creditLimit: 80000,
    balance: 28600,
    totalPurchases: 412000,
    lastPurchaseDate: '2026-07-11',
    assignedRep: 'Ama Osei',
    locationId: 'loc-kumasi',
    tags: ['Wholesale', 'Bulk'],
  },
  {
    id: 'cust-003',
    name: 'City Pharmacy Group',
    type: 'corporate',
    status: 'active',
    email: 'supply@citypharmacy.gh',
    phone: '+233 30 277 6600',
    city: 'Accra',
    creditLimit: 35000,
    balance: 8200,
    totalPurchases: 156800,
    lastPurchaseDate: '2026-07-09',
    assignedRep: 'Yaw Darko',
    locationId: 'loc-hq',
    tags: ['Healthcare'],
  },
  {
    id: 'cust-004',
    name: 'Al-Karam Trading',
    type: 'wholesale',
    status: 'on_hold',
    email: 'finance@alkaram.gh',
    phone: '+233 24 555 1200',
    city: 'Takoradi',
    creditLimit: 25000,
    balance: 24800,
    totalPurchases: 98400,
    lastPurchaseDate: '2026-06-28',
    assignedRep: 'Efua Boateng',
    locationId: 'loc-takoradi',
    tags: ['Credit hold'],
  },
  {
    id: 'cust-005',
    name: 'Northern Agro Supplies',
    type: 'government',
    status: 'active',
    email: 'tenders@northernagro.gov.gh',
    phone: '+233 37 202 9900',
    city: 'Tamale',
    tin: 'G0003456789',
    creditLimit: 100000,
    balance: 0,
    totalPurchases: 67800,
    lastPurchaseDate: '2026-07-05',
    assignedRep: 'Ibrahim Yakubu',
    locationId: 'loc-tamale',
    tags: ['Government', 'Tender'],
  },
  {
    id: 'cust-006',
    name: 'Walk-in — Ridge Market',
    type: 'retail',
    status: 'active',
    email: '',
    phone: '',
    city: 'Accra',
    creditLimit: 0,
    balance: 0,
    totalPurchases: 42800,
    lastPurchaseDate: '2026-07-11',
    assignedRep: '—',
    locationId: 'loc-hq',
    tags: ['Walk-in'],
  },
];

export const STOCK_TRANSFERS: StockTransfer[] = [
  {
    id: 'tr-001',
    reference: 'IBT-2026-0142',
    fromLocationId: 'loc-tema',
    toLocationId: 'loc-hq',
    status: 'in_transit',
    createdAt: '2026-07-10T09:30:00',
    expectedDate: '2026-07-12',
    createdBy: 'Kofi Mensah',
    lines: [
      { productName: 'Portland Cement 50kg', sku: 'CEM-50', quantity: 200 },
      { productName: 'Iron Rods 12mm', sku: 'IRD-12', quantity: 80 },
    ],
    notes: 'Urgent restock for weekend sales',
  },
  {
    id: 'tr-002',
    reference: 'IBT-2026-0141',
    fromLocationId: 'loc-hq',
    toLocationId: 'loc-kumasi',
    status: 'received',
    createdAt: '2026-07-08T14:00:00',
    expectedDate: '2026-07-09',
    createdBy: 'Kwame Asante',
    lines: [
      { productName: 'Roofing Sheets (Aluzinc)', sku: 'RFS-AZ', quantity: 120 },
      { productName: 'PVC Pipes 4"', sku: 'PVC-04', quantity: 60 },
    ],
  },
  {
    id: 'tr-003',
    reference: 'IBT-2026-0140',
    fromLocationId: 'loc-tema',
    toLocationId: 'loc-takoradi',
    status: 'draft',
    createdAt: '2026-07-11T11:15:00',
    expectedDate: '2026-07-14',
    createdBy: 'Kofi Mensah',
    lines: [{ productName: 'Paint — Exterior White 20L', sku: 'PNT-EXT', quantity: 48 }],
  },
  {
    id: 'tr-004',
    reference: 'IBT-2026-0139',
    fromLocationId: 'loc-kumasi',
    toLocationId: 'loc-tamale',
    status: 'cancelled',
    createdAt: '2026-07-05T08:00:00',
    expectedDate: '2026-07-07',
    createdBy: 'Ama Osei',
    lines: [{ productName: 'Electrical Cable 2.5mm', sku: 'ELC-25', quantity: 30 }],
    notes: 'Cancelled — Tamale branch inactive',
  },
];

export const APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'apr-001',
    type: 'purchase',
    status: 'pending',
    title: 'Bulk cement order — Tema Warehouse',
    description: 'PO-2026-0884: 500 bags Portland Cement from Ghacem Ltd',
    amount: 42500,
    requestedBy: 'Kofi Mensah',
    requestedAt: '2026-07-11T10:22:00',
    locationId: 'loc-tema',
    priority: 'high',
  },
  {
    id: 'apr-002',
    type: 'expense',
    status: 'pending',
    title: 'Generator fuel — Kumasi Branch',
    description: 'Monthly fuel for backup generator',
    amount: 2800,
    requestedBy: 'Ama Osei',
    requestedAt: '2026-07-11T08:45:00',
    locationId: 'loc-kumasi',
    priority: 'medium',
  },
  {
    id: 'apr-003',
    type: 'discount',
    status: 'pending',
    title: '15% discount — Golden Star Construction',
    description: 'Volume discount on bulk steel order (INV-DRAFT-442)',
    amount: 8400,
    requestedBy: 'Yaw Darko',
    requestedAt: '2026-07-10T16:30:00',
    locationId: 'loc-hq',
    priority: 'medium',
  },
  {
    id: 'apr-004',
    type: 'credit',
    status: 'pending',
    title: 'Credit limit increase — Al-Karam Trading',
    description: 'Request to raise limit from GHS 25,000 to GHS 40,000',
    amount: 15000,
    requestedBy: 'Efua Boateng',
    requestedAt: '2026-07-09T11:00:00',
    locationId: 'loc-takoradi',
    priority: 'high',
  },
  {
    id: 'apr-005',
    type: 'transfer',
    status: 'approved',
    title: 'Inter-branch transfer IBT-2026-0141',
    description: 'HQ → Kumasi: Roofing sheets and PVC pipes',
    amount: 0,
    requestedBy: 'Kwame Asante',
    requestedAt: '2026-07-08T13:50:00',
    locationId: 'loc-hq',
    priority: 'low',
  },
];

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    type: 'low_stock',
    title: 'Low stock alert',
    message: '24 SKUs below reorder level at Tema Warehouse',
    createdAt: '2026-07-11T07:00:00',
    read: false,
    href: '/dashboard/inventory',
    priority: 'high',
  },
  {
    id: 'notif-002',
    type: 'approval',
    title: '4 approvals pending',
    message: 'Purchase orders and expenses awaiting your review',
    createdAt: '2026-07-11T10:30:00',
    read: false,
    href: '/dashboard/approvals',
    priority: 'high',
  },
  {
    id: 'notif-003',
    type: 'transfer',
    title: 'Transfer in transit',
    message: 'IBT-2026-0142: Tema → HQ expected today',
    createdAt: '2026-07-11T06:15:00',
    read: false,
    href: '/dashboard/stock',
    priority: 'medium',
  },
  {
    id: 'notif-004',
    type: 'payment',
    title: 'Overdue receivable',
    message: 'Al-Karam Trading: GHS 24,800 past due (32 days)',
    createdAt: '2026-07-10T09:00:00',
    read: true,
    href: '/dashboard/customers',
    priority: 'high',
  },
  {
    id: 'notif-005',
    type: 'system',
    title: 'Monthly report ready',
    message: 'June 2026 GRA tax report is available for export',
    createdAt: '2026-07-01T08:00:00',
    read: true,
    href: '/dashboard/gra-reports',
    priority: 'low',
  },
];

export const ACTIVITY_LOG: ActivityEntry[] = [
  {
    id: 'act-001',
    action: 'create',
    entity: 'Sale',
    entityId: 'RCP-2026-8842',
    description: 'Processed POS sale — GHS 1,240.00 (Cash)',
    user: 'Yaw Darko',
    userRole: 'Sales Representative',
    locationId: 'loc-hq',
    timestamp: '2026-07-11T11:42:00',
    ip: '192.168.1.45',
  },
  {
    id: 'act-002',
    action: 'approve',
    entity: 'Transfer',
    entityId: 'IBT-2026-0141',
    description: 'Approved inter-branch stock transfer HQ → Kumasi',
    user: 'Kwame Asante',
    userRole: 'Administrator',
    locationId: 'loc-hq',
    timestamp: '2026-07-08T14:05:00',
    ip: '192.168.1.12',
  },
  {
    id: 'act-003',
    action: 'update',
    entity: 'Product',
    entityId: 'PRD-CEM-50',
    description: 'Updated reorder level for Portland Cement 50kg (50 → 80)',
    user: 'Kofi Mensah',
    userRole: 'Inventory Manager',
    locationId: 'loc-tema',
    timestamp: '2026-07-11T09:18:00',
    ip: '10.0.2.15',
  },
  {
    id: 'act-004',
    action: 'create',
    entity: 'Purchase',
    entityId: 'PO-2026-0883',
    description: 'Created purchase order — Ghacem Ltd, GHS 18,500',
    user: 'Ama Osei',
    userRole: 'Inventory Manager',
    locationId: 'loc-kumasi',
    timestamp: '2026-07-10T15:30:00',
    ip: '192.168.2.8',
  },
  {
    id: 'act-005',
    action: 'export',
    entity: 'Report',
    entityId: 'GRA-2026-06',
    description: 'Exported GRA tax report for June 2026',
    user: 'Abena Kwarteng',
    userRole: 'Accountant',
    locationId: 'loc-hq',
    timestamp: '2026-07-01T10:00:00',
    ip: '192.168.1.20',
  },
  {
    id: 'act-006',
    action: 'login',
    entity: 'Session',
    entityId: 'sess-88421',
    description: 'Logged in from Chrome on macOS',
    user: 'Efua Boateng',
    userRole: 'Sales Representative',
    locationId: 'loc-takoradi',
    timestamp: '2026-07-11T08:02:00',
    ip: '41.190.45.88',
  },
  {
    id: 'act-007',
    action: 'reject',
    entity: 'Approval',
    entityId: 'apr-006',
    description: 'Rejected credit limit increase for walk-in customer',
    user: 'Kwame Asante',
    userRole: 'Administrator',
    locationId: 'loc-hq',
    timestamp: '2026-07-09T16:45:00',
    ip: '192.168.1.12',
  },
  {
    id: 'act-008',
    action: 'transfer',
    entity: 'Stock',
    entityId: 'IBT-2026-0142',
    description: 'Dispatched 200 bags cement + 80 iron rods to HQ',
    user: 'Kofi Mensah',
    userRole: 'Inventory Manager',
    locationId: 'loc-tema',
    timestamp: '2026-07-10T09:35:00',
    ip: '10.0.2.15',
  },
];

export const GLOBAL_SEARCH_INDEX: GlobalSearchResult[] = [
  { id: 'p1', type: 'product', title: 'Portland Cement 50kg', subtitle: 'SKU: CEM-50 · 420 in stock', href: '/dashboard/products' },
  { id: 'p2', type: 'product', title: 'Iron Rods 12mm', subtitle: 'SKU: IRD-12 · 156 in stock', href: '/dashboard/products' },
  { id: 'p3', type: 'product', title: 'Roofing Sheets (Aluzinc)', subtitle: 'SKU: RFS-AZ · 88 in stock', href: '/dashboard/products' },
  { id: 'c1', type: 'customer', title: 'Golden Star Construction Ltd', subtitle: 'Corporate · Accra · GHS 12,400 balance', href: '/dashboard/customers' },
  { id: 'c2', type: 'customer', title: 'Metro Mart Retail Chain', subtitle: 'Wholesale · Kumasi', href: '/dashboard/customers' },
  { id: 'r1', type: 'receipt', title: 'RCP-2026-8842', subtitle: 'GHS 1,240.00 · Today 11:42 AM', href: '/dashboard/receipts' },
  { id: 'r2', type: 'receipt', title: 'RCP-2026-8839', subtitle: 'GHS 4,680.00 · Yesterday', href: '/dashboard/receipts' },
  { id: 's1', type: 'supplier', title: 'Ghacem Ltd', subtitle: 'Cement · Active', href: '/dashboard/suppliers' },
  { id: 's2', type: 'supplier', title: 'B5 Plus Steel', subtitle: 'Steel & Iron · Active', href: '/dashboard/suppliers' },
  { id: 'st1', type: 'staff', title: 'Kwame Asante', subtitle: 'Administrator · Head Office', href: '/dashboard/attendance' },
  { id: 'st2', type: 'staff', title: 'Ama Osei', subtitle: 'Inventory Manager · Kumasi', href: '/dashboard/attendance' },
  { id: 'pg1', type: 'page', title: 'Warehouses', subtitle: 'Warehouse & store management', href: '/dashboard/warehouses' },
  { id: 'pg2', type: 'page', title: 'Stock Management', subtitle: 'Stock in, out, adjustments, history', href: '/dashboard/stock' },
];

export function locationName(id: string): string {
  return BUSINESS_LOCATIONS.find((l) => l.id === id)?.name ?? id;
}

export function locationCode(id: string): string {
  return BUSINESS_LOCATIONS.find((l) => l.id === id)?.code ?? id;
}

export function formatEnterpriseCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  headquarters: 'Headquarters',
  branch: 'Branch',
  warehouse: 'Warehouse',
  showroom: 'Showroom',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  retail: 'Retail',
  wholesale: 'Wholesale',
  corporate: 'Corporate',
  government: 'Government',
};

export const TRANSFER_STATUS_COLORS: Record<TransferStatus, string> = {
  draft: 'default',
  in_transit: 'processing',
  received: 'success',
  cancelled: 'error',
};

export const APPROVAL_TYPE_LABELS: Record<ApprovalType, string> = {
  purchase: 'Purchase',
  expense: 'Expense',
  transfer: 'Transfer',
  discount: 'Discount',
  credit: 'Credit',
};
