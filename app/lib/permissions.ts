export type Permission =
  | 'dashboard'
  | 'charts'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'price_list'
  | 'suppliers'
  | 'purchases'
  | 'locations'
  | 'warehouses'
  | 'stock_management'
  | 'stock_transfers'
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
  | 'settings'
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
      { key: 'price_list', label: 'Price List', description: 'View and export price lists' },
      { key: 'suppliers', label: 'Suppliers', description: 'Manage suppliers' },
      { key: 'purchases', label: 'Purchases', description: 'Record purchase orders' },
      { key: 'locations', label: 'Locations', description: 'Manage branches and warehouses' },
      { key: 'warehouses', label: 'Warehouses', description: 'Warehouses, storage locations, and managers' },
      { key: 'stock_management', label: 'Stock Management', description: 'Stock in/out, adjustments, and history' },
      { key: 'stock_transfers', label: 'Stock Transfers', description: 'Inter-location inventory transfers' },
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
      { key: 'activity_log', label: 'Activity Log', description: 'View system audit trail' },
    ],
  },
  {
    label: 'System',
    permissions: [
      { key: 'settings', label: 'Settings', description: 'Configure business and system settings' },
      { key: 'manage_roles', label: 'Manage roles', description: 'Create and edit user roles and permissions' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key)
);

export const PATH_PERMISSIONS: Record<string, Permission> = {
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
  '/dashboard/stock': 'stock_management',
  '/dashboard/transfers': 'stock_management',
  '/dashboard/sales': 'sales_pos',
  '/dashboard/reports': 'sales_reports',
  '/dashboard/receipts': 'receipts',
  '/dashboard/proforma-invoices': 'proforma_invoices',
  '/dashboard/customers': 'customers',
  '/dashboard/approvals': 'approvals',
  '/dashboard/activity': 'activity_log',
  // '/dashboard/bank': 'bank',
  '/dashboard/expenses': 'expenses',
  '/dashboard/accounts': 'chart_of_accounts',
  '/dashboard/gra-reports': 'gra_reports',
  '/dashboard/payroll': 'payroll',
  '/dashboard/attendance': 'staff_attendance',
  '/dashboard/users': 'users',
  '/dashboard/settings': 'settings',
};

export type DashboardVariant = 'admin' | 'sales' | 'inventory' | 'finance' | 'hr';

/** Maps built-in role slugs to their tailored dashboard layout. */
export const ROLE_DASHBOARD_VARIANT: Record<string, DashboardVariant> = {
  admin: 'admin',
  cashier: 'sales',
  sales: 'sales',
  gra_reporter: 'finance',
  accountant: 'finance',
  inventory_manager: 'inventory',
  stock_clerk: 'inventory',
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
    name: 'Inventory Manager',
    description: 'Stock levels, suppliers, and purchase orders',
    permissions: [
      'dashboard',
      'products',
      'inventory',
      'categories',
      'price_list',
      'suppliers',
      'purchases',
      'warehouses',
      'stock_management',
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
    permissions: ['dashboard', 'staff_attendance', 'payroll', 'users'],
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
    const permissions =
      defaults.id === 'admin'
        ? [...ALL_PERMISSIONS]
        : Array.from(new Set([...defaults.permissions, ...fromApi.permissions]));

    return {
      ...defaults,
      ...fromApi,
      id: defaults.id,
      isSystem: true,
      permissions,
    };
  });
  return [...system, ...custom];
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
  const permission = PATH_PERMISSIONS[path];
  if (!permission) return true;
  return roleHasPermission(roleId, permission, roles);
}

export function hasEntitlement(entitlements: Permission[] | undefined, permission: Permission): boolean {
  return Boolean(entitlements?.includes(permission));
}

export function canAccessPathByEntitlements(entitlements: Permission[] | undefined, path: string): boolean {
  const permission = PATH_PERMISSIONS[path];
  if (!permission) return true;
  return hasEntitlement(entitlements, permission);
}

export function userCanAccessPath(
  roleId: string,
  entitlements: Permission[] | undefined,
  path: string,
  roles: RoleDefinition[]
): boolean {
  const permission = PATH_PERMISSIONS[path];
  if (!permission) return true;
  // Normalized roles include built-in defaults (new UI permissions before API sync)
  if (roleHasPermission(roleId, permission, roles)) return true;
  if (entitlements?.length) return hasEntitlement(entitlements, permission);
  return false;
}

export function userHasPermission(
  roleId: string,
  entitlements: Permission[] | undefined,
  permission: Permission,
  roles: RoleDefinition[]
): boolean {
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
  if (perms.includes('purchases') || perms.includes('suppliers')) return 'inventory';
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
