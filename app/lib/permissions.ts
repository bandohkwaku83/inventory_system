export type Permission =
  | 'dashboard'
  | 'charts'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'price_list'
  | 'suppliers'
  | 'purchases'
  | 'all_categories'
  | 'sales_pos'
  | 'sales_reports'
  | 'receipts'
  | 'proforma_invoices'
  | 'bank'
  | 'expenses'
  | 'chart_of_accounts'
  | 'gra_reports'
  | 'payroll'
  | 'staff_attendance'
  | 'users'
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
      { key: 'all_categories', label: 'All categories', description: 'Access every shop section (not restricted by category assignment)' },
    ],
  },
  {
    label: 'Sales',
    permissions: [
      { key: 'sales_pos', label: 'Sales (POS)', description: 'Process point-of-sale transactions' },
      { key: 'sales_reports', label: 'Sales Reports', description: 'View sales analytics' },
      { key: 'receipts', label: 'Receipts', description: 'View and reprint receipts' },
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
  '/dashboard/sales': 'sales_pos',
  '/dashboard/reports': 'sales_reports',
  '/dashboard/receipts': 'receipts',
  '/dashboard/proforma-invoices': 'proforma_invoices',
  // '/dashboard/bank': 'bank',
  '/dashboard/expenses': 'expenses',
  '/dashboard/accounts': 'chart_of_accounts',
  '/dashboard/gra-reports': 'gra_reports',
  '/dashboard/payroll': 'payroll',
  '/dashboard/attendance': 'staff_attendance',
  '/dashboard/users': 'users',
  '/dashboard/settings': 'settings',
};

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features and settings',
    permissions: [...ALL_PERMISSIONS],
    isSystem: true,
  },
  {
    id: 'cashier',
    name: 'Cashier',
    description: 'Point-of-sale and sales with optional category restrictions',
    permissions: [
      'dashboard',
      'products',
      'inventory',
      'price_list',
      'sales_pos',
      'sales_reports',
      'receipts',
      'proforma_invoices',
    ],
    isSystem: true,
  },
  {
    id: 'gra_reporter',
    name: 'GRA Reporter',
    description: 'GRA tax reporting and sales visibility',
    permissions: ['dashboard', 'charts', 'sales_reports', 'receipts', 'gra_reports'],
    isSystem: true,
  },
];

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
  if (entitlements?.length) return canAccessPathByEntitlements(entitlements, path);
  return canAccessPath(roleId, path, roles);
}

export function userHasPermission(
  roleId: string,
  entitlements: Permission[] | undefined,
  permission: Permission,
  roles: RoleDefinition[]
): boolean {
  if (entitlements?.length) return hasEntitlement(entitlements, permission);
  return roleHasPermission(roleId, permission, roles);
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

export function slugifyRoleId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
