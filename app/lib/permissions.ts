export type Permission =
  | 'dashboard'
  | 'charts'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'departments'
  | 'price_list'
  | 'suppliers'
  | 'purchases'
  | 'locations'
  | 'warehouses'
  | 'stock_management'
  | 'stock_transfers'
  | 'warehouse_transfers'
  | 'goods_receipt'
  | 'goods_issue'
  | 'stock_counts'
  | 'all_categories'
  | 'sales_pos'
  | 'sales_reports'
  | 'receipts'
  | 'proforma_invoices'
  | 'customers'
  | 'bank'
  | 'expenses'
  | 'chart_of_accounts'
  | 'gra_reports'
  | 'payroll'
  | 'staff_attendance'
  | 'users'
  | 'approvals'
  | 'activity_log'
  | 'audit_log'
  | 'settings'
  | 'sms'
  | 'manage_roles';

export interface PermissionGroup {
  label: string;
  permissions: { key: Permission; label: string; description?: string }[];
}

export interface RoleDefinition {
  id: string;
  /** MongoDB id used for API calls. */
  apiId?: string;
  slug?: string;
  name: string;
  description: string;
  permissions: Permission[];
  /** Built-in roles cannot be deleted. */
  isSystem: boolean;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Overview',
    permissions: [
      { key: 'dashboard', label: 'Dashboard', description: 'View main dashboard' },
      { key: 'charts', label: 'Charts', description: 'View analytics charts' },
    ],
  },
  {
    label: 'Catalog',
    permissions: [
      { key: 'products', label: 'Products', description: 'Manage product catalog' },
      { key: 'inventory', label: 'Inventory', description: 'View and adjust stock levels' },
      { key: 'categories', label: 'Categories', description: 'Manage product categories' },
      { key: 'departments', label: 'Departments', description: 'Manage departments and divisions' },
      { key: 'price_list', label: 'Price List', description: 'View and export price lists' },
      { key: 'suppliers', label: 'Suppliers', description: 'Manage suppliers' },
      { key: 'purchases', label: 'Purchases', description: 'Record purchase orders' },
      { key: 'locations', label: 'Locations', description: 'Manage branches and warehouses' },
      { key: 'warehouses', label: 'Warehouses', description: 'Warehouses, storage locations, and managers' },
      { key: 'goods_receipt', label: 'Goods Receipts', description: 'Receive supplier deliveries into warehouse' },
      { key: 'goods_issue', label: 'Goods Issues', description: 'Request and issue stock from warehouse' },
      { key: 'warehouse_transfers', label: 'Warehouse Transfers', description: 'Move stock between warehouses' },
      { key: 'stock_counts', label: 'Stock Counts', description: 'Cycle counts and inventory variances' },
      { key: 'stock_management', label: 'Stock Movements', description: 'Ledger adjustments (advanced / admin)' },
      { key: 'stock_transfers', label: 'Stock Transfers (legacy)', description: 'Legacy alias for warehouse transfers' },
      { key: 'all_categories', label: 'All categories', description: 'Access every shop section (not restricted by category assignment)' },
    ],
  },
  {
    label: 'Sales',
    permissions: [
      { key: 'sales_pos', label: 'Sales (POS)', description: 'Process point-of-sale transactions' },
      { key: 'sales_reports', label: 'Sales Reports', description: 'View sales analytics' },
      { key: 'receipts', label: 'Receipts', description: 'View and reprint receipts' },
      { key: 'customers', label: 'Customers', description: 'Customer accounts and receivables' },
    ],
  },
  {
    label: 'Finance',
    permissions: [
      { key: 'proforma_invoices', label: 'Proforma Invoices', description: 'Create proforma invoices' },
      // { key: 'bank', label: 'Bank', description: 'Bank accounts and transactions' },
      { key: 'expenses', label: 'Expenses', description: 'Track business expenses' },
      { key: 'chart_of_accounts', label: 'Chart of Accounts', description: 'Manage accounting structure' },
      { key: 'gra_reports', label: 'GRA Reports', description: 'View and export GRA tax reports' },
    ],
  },
  {
    label: 'People',
    permissions: [
      { key: 'payroll', label: 'Payroll', description: 'Staff salary records and monthly registers' },
      { key: 'staff_attendance', label: 'Staff Management', description: 'Manage staff and track attendance' },
      { key: 'users', label: 'Users', description: 'Manage system users' },
    ],
  },
  {
    label: 'Governance',
    permissions: [
      { key: 'approvals', label: 'Approvals', description: 'Review and approve requests' },
      { key: 'audit_log', label: 'Audit Log', description: 'View system audit trail' },
      { key: 'activity_log', label: 'Activity Log (legacy)', description: 'Legacy alias for audit log' },
    ],
  },
  {
    label: 'System',
    permissions: [
      { key: 'sms', label: 'SMS', description: 'Send SMS messages and view delivery history' },
      {
        key: 'settings',
        label: 'Settings',
        description: 'Configure business and system settings (Administrator only)',
      },
      { key: 'manage_roles', label: 'Manage roles', description: 'Create and edit user roles and permissions' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

/** One path may accept any of several entitlements (OR). */
export type PathPermissionRequirement = Permission | Permission[];

export const PATH_PERMISSIONS: Record<string, PathPermissionRequirement> = {
  '/dashboard': 'dashboard',
  '/dashboard/charts': 'charts',
  '/dashboard/products': 'products',
  '/dashboard/inventory': 'inventory',
  '/dashboard/categories': 'categories',
  '/dashboard/price-list': 'price_list',
  '/dashboard/suppliers': 'suppliers',
  '/dashboard/purchases': 'purchases',
  '/dashboard/locations': 'warehouses',
  '/dashboard/warehouses': 'warehouses',
  '/dashboard/stock': ['stock_management', 'inventory', 'warehouses'],
  '/dashboard/stock-movements': ['stock_management', 'inventory', 'warehouses'],
  '/dashboard/transfers': ['warehouse_transfers', 'stock_transfers'],
  '/dashboard/warehouse-transfers': ['warehouse_transfers', 'stock_transfers'],
  '/dashboard/goods-receipts': 'goods_receipt',
  '/dashboard/goods-issues': 'goods_issue',
  '/dashboard/stock-counts': 'stock_counts',
  '/dashboard/sales': 'sales_pos',
  '/dashboard/reports': 'sales_reports',
  '/dashboard/receipts': 'receipts',
  '/dashboard/proforma-invoices': 'proforma_invoices',
  '/dashboard/customers': 'customers',
  '/dashboard/approvals': 'approvals',
  '/dashboard/activity': ['audit_log', 'activity_log'],
  '/dashboard/audit-log': ['audit_log', 'activity_log'],
  // '/dashboard/bank': 'bank',
  '/dashboard/expenses': 'expenses',
  '/dashboard/accounts': 'chart_of_accounts',
  '/dashboard/gra-reports': 'gra_reports',
  '/dashboard/payroll': 'payroll',
  '/dashboard/attendance': 'staff_attendance',
  '/dashboard/users': 'users',
  '/dashboard/sms': 'sms',
  '/dashboard/settings': 'settings',
};

function requirementList(req: PathPermissionRequirement): Permission[] {
  return Array.isArray(req) ? req : [req];
}

/** Exact match, else longest registered prefix (e.g. `/dashboard/warehouses/:id`). */
export function resolvePathRequirement(
  path: string
): PathPermissionRequirement | undefined {
  if (PATH_PERMISSIONS[path]) return PATH_PERMISSIONS[path];
  const prefixes = Object.keys(PATH_PERMISSIONS)
    .filter((p) => path.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length);
  return prefixes[0] ? PATH_PERMISSIONS[prefixes[0]] : undefined;
}

export type DashboardVariant = 'admin' | 'sales' | 'inventory' | 'finance' | 'hr';

/** Maps built-in role slugs to their tailored dashboard layout. */
export const ROLE_DASHBOARD_VARIANT: Record<string, DashboardVariant> = {
  admin: 'admin',
  cashier: 'sales',
  sales: 'sales',
  gra_reporter: 'finance',
  accountant: 'finance',
  inventory_manager: 'inventory',
  warehouse_manager: 'inventory',
  stock_clerk: 'inventory',
  store_keeper: 'inventory',
  requester: 'inventory',
  auditor: 'inventory',
  hr_manager: 'hr',
};

export const DASHBOARD_VARIANT_LABELS: Record<DashboardVariant, string> = {
  admin: 'Operations overview',
  sales: 'Sales workspace',
  inventory: 'Inventory workspace',
  finance: 'Finance workspace',
  hr: 'People workspace',
};

/** Built-in system role slugs shown in Roles & access. */
export const SYSTEM_ROLE_IDS = [
  'admin',
  'sales',
  'inventory_manager',
  'store_keeper',
  'requester',
  'auditor',
  'accountant',
  'hr_manager',
] as const;

export type SystemRoleId = (typeof SYSTEM_ROLE_IDS)[number];

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features and settings',
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: 'sales',
    name: 'Sales Representative',
    description: 'Point-of-sale, receipts, and sales reporting',
    permissions: [
      'dashboard',
      'products',
      'price_list',
      'sales_pos',
      'sales_reports',
      'receipts',
      'proforma_invoices',
      'customers',
    ],
    isSystem: true,
  },
  {
    id: 'inventory_manager',
    name: 'Warehouse Manager',
    description: 'Warehouses, approvals, receipts, issues, transfers, and counts',
    permissions: [
      'dashboard',
      'products',
      'inventory',
      'categories',
      'price_list',
      'suppliers',
      'purchases',
      'warehouses',
      'goods_receipt',
      'goods_issue',
      'warehouse_transfers',
      'stock_counts',
      'stock_management',
      'stock_transfers',
      'approvals',
    ],
    isSystem: true,
  },
  {
    id: 'store_keeper',
    name: 'Store Keeper',
    description: 'Receive goods, pick issues, and stock counts',
    permissions: [
      'dashboard',
      'products',
      'inventory',
      'warehouses',
      'goods_receipt',
      'goods_issue',
      'stock_counts',
    ],
    isSystem: true,
  },
  {
    id: 'requester',
    name: 'Requester',
    description: 'Request products from warehouse (goods issues)',
    permissions: ['dashboard', 'products', 'inventory', 'goods_issue'],
    isSystem: true,
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'View inventory reports, history, and audit log',
    permissions: [
      'dashboard',
      'charts',
      'products',
      'inventory',
      'warehouses',
      'sales_reports',
      'audit_log',
      'activity_log',
    ],
    isSystem: true,
  },
  {
    id: 'accountant',
    name: 'Accountant',
    description: 'Expenses, tax reporting, and financial analytics',
    permissions: [
      'dashboard',
      'charts',
      'sales_reports',
      'receipts',
      'proforma_invoices',
      'expenses',
      'chart_of_accounts',
      'gra_reports',
    ],
    isSystem: true,
  },
  {
    id: 'hr_manager',
    name: 'HR Manager',
    description: 'Staff records, attendance, and payroll',
    permissions: ['dashboard', 'staff_attendance', 'payroll', 'users', 'departments'],
    isSystem: true,
  },
];

const SYSTEM_ROLE_ID_SET = new Set<string>(SYSTEM_ROLE_IDS);

/** Keeps only the built-in system roles plus any custom roles from the API. */
export function normalizeSystemRoles(fetched: RoleDefinition[]): RoleDefinition[] {
  const custom = fetched.filter((role) => !role.isSystem);
  const systemFromApi = new Map(
    fetched
      .filter((role) => role.isSystem && SYSTEM_ROLE_ID_SET.has(role.id))
      .map((role) => [role.id, role])
  );
  const system = DEFAULT_ROLES.map((defaults) => {
    const fromApi = systemFromApi.get(defaults.id);
    if (!fromApi) return defaults;

    // Admin always gets every permission. Other system roles merge API + built-in defaults
    // so new frontend permissions appear before the API is updated.
    // Settings stays admin-only even if the API grants it to another system role.
    const merged =
      defaults.id === 'admin'
        ? [...ALL_PERMISSIONS]
        : Array.from(new Set([...defaults.permissions, ...fromApi.permissions])).filter(
            (p) => p !== 'settings'
          );

    return {
      ...defaults,
      ...fromApi,
      id: defaults.id,
      isSystem: true,
      permissions: merged,
    };
  });
  return [...system, ...custom];
}

/** Built-in administrator role slug. Settings (and similar) are admin-only. */
export function isAdminRole(roleId: string): boolean {
  return roleId === 'admin';
}

export function findRole(roleId: string, roles: RoleDefinition[]): RoleDefinition | undefined {
  return roles.find((r) => r.id === roleId);
}

export function roleDisplayName(roleId: string, roles: RoleDefinition[]): string {
  return findRole(roleId, roles)?.name ?? roleId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function roleHasPermission(
  roleId: string,
  permission: Permission,
  roles: RoleDefinition[]
): boolean {
  const role = findRole(roleId, roles);
  if (!role) return false;
  return role.permissions.includes(permission);
}

export function canAccessPath(roleId: string, path: string, roles: RoleDefinition[]): boolean {
  const requirement = resolvePathRequirement(path);
  if (!requirement) return true;
  if (requirementList(requirement).includes('settings')) {
    return isAdminRole(roleId);
  }
  return requirementList(requirement).some((p) => roleHasPermission(roleId, p, roles));
}

export function hasEntitlement(entitlements: Permission[] | undefined, permission: Permission): boolean {
  return Boolean(entitlements?.includes(permission));
}

export function hasAnyEntitlement(
  entitlements: Permission[] | undefined,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasEntitlement(entitlements, p));
}

export function canAccessPathByEntitlements(entitlements: Permission[] | undefined, path: string): boolean {
  const requirement = resolvePathRequirement(path);
  if (!requirement) return true;
  // Settings cannot be granted via entitlements alone — admin role is required.
  if (requirementList(requirement).includes('settings')) return false;
  return hasAnyEntitlement(entitlements, requirementList(requirement));
}

export function userCanAccessPath(
  roleId: string,
  entitlements: Permission[] | undefined,
  path: string,
  roles: RoleDefinition[]
): boolean {
  const requirement = resolvePathRequirement(path);
  if (!requirement) return true;
  // Settings is restricted to the admin role, regardless of entitlements.
  if (requirementList(requirement).includes('settings')) {
    return isAdminRole(roleId);
  }
  const needed = requirementList(requirement);
  // Normalized roles include built-in defaults (new UI permissions before API sync)
  if (needed.some((p) => roleHasPermission(roleId, p, roles))) return true;
  if (entitlements?.length) return hasAnyEntitlement(entitlements, needed);
  return false;
}

export function userHasPermission(
  roleId: string,
  entitlements: Permission[] | undefined,
  permission: Permission,
  roles: RoleDefinition[]
): boolean {
  if (permission === 'settings') return isAdminRole(roleId);
  if (roleHasPermission(roleId, permission, roles)) return true;
  if (entitlements?.length) return hasEntitlement(entitlements, permission);
  return false;
}

export function hasFullCatalogAccess(
  roleId: string,
  categoryIds: string[],
  roles: RoleDefinition[],
  entitlements?: Permission[]
): boolean {
  if (entitlements?.length) {
    return hasEntitlement(entitlements, 'all_categories') || categoryIds.length === 0;
  }
  return roleHasPermission(roleId, 'all_categories', roles) || categoryIds.length === 0;
}

export function canAccessGraReports(
  roleId: string,
  roles: RoleDefinition[],
  entitlements?: Permission[]
): boolean {
  if (entitlements?.length) return hasEntitlement(entitlements, 'gra_reports');
  return roleHasPermission(roleId, 'gra_reports', roles);
}

export function canManageRoles(
  roleId: string,
  roles: RoleDefinition[],
  entitlements?: Permission[]
): boolean {
  if (entitlements?.length) return hasEntitlement(entitlements, 'manage_roles');
  return roleHasPermission(roleId, 'manage_roles', roles);
}

export function roleRequiresCategoryAssignment(
  roleId: string,
  roles: RoleDefinition[],
  entitlements?: Permission[]
): boolean {
  return !userHasPermission(roleId, entitlements, 'all_categories', roles);
}

export function defaultLandingPath(
  roleId: string,
  roles: RoleDefinition[],
  entitlements?: Permission[]
): string {
  for (const path of Object.keys(PATH_PERMISSIONS)) {
    if (userCanAccessPath(roleId, entitlements, path, roles)) {
      return path;
    }
  }
  return '/dashboard';
}

function effectivePermissions(
  roleId: string,
  entitlements: Permission[] | undefined,
  roles: RoleDefinition[]
): Permission[] {
  if (entitlements?.length) return entitlements;
  return findRole(roleId, roles)?.permissions ?? [];
}

/** Picks the dashboard layout for a user based on role slug or entitlements. */
export function resolveDashboardVariant(
  roleId: string,
  entitlements: Permission[] | undefined,
  roles: RoleDefinition[]
): DashboardVariant {
  const mapped = ROLE_DASHBOARD_VARIANT[roleId];
  if (mapped) return mapped;

  const perms = effectivePermissions(roleId, entitlements, roles);

  if (perms.includes('manage_roles') || perms.includes('settings')) return 'admin';
  if (perms.includes('staff_attendance') && !perms.includes('sales_pos')) return 'hr';
  if (perms.includes('gra_reports') || (perms.includes('expenses') && !perms.includes('sales_pos'))) {
    return 'finance';
  }
  if (
    perms.includes('purchases') ||
    perms.includes('suppliers') ||
    perms.includes('goods_receipt') ||
    perms.includes('goods_issue') ||
    perms.includes('warehouse_transfers') ||
    perms.includes('stock_counts')
  ) {
    return 'inventory';
  }
  if (perms.includes('sales_pos')) return 'sales';

  return 'admin';
}

export function slugifyRoleId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
