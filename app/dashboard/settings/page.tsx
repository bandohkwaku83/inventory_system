'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  People as PeopleIcon,
  StorefrontOutlined as StorefrontIcon,
  LocationOnOutlined as LocationIcon,
  PhoneOutlined as PhoneIcon,
  EmailOutlined as EmailIcon,
  ImageOutlined as ImageIcon,
  SecurityOutlined as SecurityIcon,
  ChevronRight as ChevronRightIcon,
  Category as CategoryIcon,
  Gavel as GavelIcon,
  WorkOutline as WorkOutlineIcon,
} from '@mui/icons-material';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, CloseOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  useSettings,
  buildDepartmentTree,
  collectDescendantNames,
  getDivisions,
  type Department,
  type ProductCategory,
} from '../../context/SettingsContext';
import type { ReceiptSettings } from '../../context/SettingsContext';
import { useProducts } from '../../context/ProductsContext';
import { useStaff } from '../../context/StaffContext';
import {
  canManageRoles,
  isAdminRole,
  type Permission,
  type RoleDefinition,
} from '../../lib/permissions';
import { GHANA_TAX_RATES } from '../../lib/tax';

const { Text, Title } = Typography;

const BRAND = '#25395c';

type SettingsSection =
  | 'business'
  | 'tax'
  | 'receipt'
  | 'categories'
  | 'departments'
  | 'roles';

const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'business',
    label: 'Business profile',
    description: 'Store name, contact & logo',
    icon: BusinessIcon,
  },
  {
    id: 'tax',
    label: 'Tax & compliance',
    description: 'TIN and Ghana tax rates',
    icon: GavelIcon,
  },
  {
    id: 'receipt',
    label: 'Receipt template',
    description: 'What appears on printed receipts',
    icon: ReceiptIcon,
  },
  {
    id: 'categories',
    label: 'Product categories',
    description: 'Shop sections for inventory',
    icon: CategoryIcon,
  },
  {
    id: 'departments',
    label: 'Departments',
    description: 'Departments and divisions',
    icon: WorkOutlineIcon,
  },
  {
    id: 'roles',
    label: 'Roles & access',
    description: 'Permissions for each user role',
    icon: PeopleIcon,
  },
];

const RECEIPT_TOGGLES: {
  key: keyof Pick<
    ReceiptSettings,
    'showLogo' | 'showAddress' | 'showPhone' | 'showEmail' | 'showTaxId'
  >;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { key: 'showLogo', label: 'Store logo', description: 'Display your logo at the top', icon: ImageIcon },
  { key: 'showAddress', label: 'Address', description: 'Show business address on receipt', icon: LocationIcon },
  { key: 'showPhone', label: 'Phone number', description: 'Include contact phone', icon: PhoneIcon },
  { key: 'showEmail', label: 'Email address', description: 'Include contact email', icon: EmailIcon },
  { key: 'showTaxId', label: 'Tax ID (TIN)', description: 'Show your business TIN on receipts', icon: GavelIcon },
];

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 w-full border-b border-slate-200/80 pb-6">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function RoleRow({
  role,
  canEdit,
  onEdit,
  onDelete,
}: {
  role: RoleDefinition;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-slate-900">{role.name}</p>
          {role.isSystem ? (
            <Tag bordered={false} className="!m-0 rounded-full px-2 text-[11px] font-medium" color="processing">
              System
            </Tag>
          ) : (
            <Tag bordered={false} className="!m-0 rounded-full px-2 text-[11px] font-medium" color="success">
              Custom
            </Tag>
          )}
          <span className="text-xs text-slate-400">
            {role.permissions.length} entitlement{role.permissions.length !== 1 ? 's' : ''}
          </span>
        </div>
        {role.description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{role.description}</p>
        ) : null}
      </div>
      {canEdit ? (
        <Space size={4} className="shrink-0">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            className="!text-slate-500 hover:!text-slate-800"
            onClick={onEdit}
          />
          {!role.isSystem ? (
            <Popconfirm
              title="Delete this role?"
              description="Users assigned to this role will keep the role ID until reassigned."
              onConfirm={onDelete}
              okText="Delete"
              cancelText="Cancel"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
        </Space>
      ) : null}
    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`block w-full min-w-0 ${className ?? ''}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon sx={{ fontSize: 14 }} className="text-slate-400" /> : null}
        {label}
      </span>
      {children}
    </div>
  );
}

function ReceiptPreview({
  businessName,
  address,
  phone,
  email,
  taxId,
  logoUrl,
  footerMessage,
  settings,
}: {
  businessName: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  logoUrl: string | null;
  footerMessage: string;
  settings: ReceiptSettings;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Live preview
      </p>
      <div className="mx-auto max-w-[220px] rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 font-mono text-[10px] leading-relaxed text-slate-700 shadow-inner">
        {settings.showLogo ? (
          logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="mx-auto mb-3 h-10 w-auto max-w-[120px] object-contain"
            />
          ) : (
            <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-[8px] text-slate-400">
              LOGO
            </div>
          )
        ) : null}
        <p className="text-center text-[11px] font-bold text-slate-900">{businessName || 'Your Store'}</p>
        {settings.showAddress && address ? (
          <p className="mt-1 text-center text-slate-500">{address}</p>
        ) : null}
        {settings.showPhone && phone ? (
          <p className="mt-0.5 text-center text-slate-500">{phone}</p>
        ) : null}
        {settings.showEmail && email ? (
          <p className="mt-0.5 text-center text-slate-500">{email}</p>
        ) : null}
        {settings.showTaxId && taxId ? (
          <p className="mt-0.5 text-center text-slate-500">TIN: {taxId}</p>
        ) : null}
        <div className="my-3 border-t border-dashed border-slate-200" />
        <div className="space-y-1 text-slate-400">
          <div className="flex justify-between">
            <span>Item x1</span>
            <span>GHS 25.00</span>
          </div>
          <div className="flex justify-between">
            <span>Item x2</span>
            <span>GHS 40.00</span>
          </div>
        </div>
        <div className="my-3 border-t border-dashed border-slate-200" />
        <div className="flex justify-between font-bold text-slate-800">
          <span>Total</span>
          <span>GHS 65.00</span>
        </div>
        {footerMessage ? (
          <p className="mt-4 text-center text-[9px] text-slate-400">{footerMessage}</p>
        ) : null}
      </div>
    </div>
  );
}

const LOGO_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const LOGO_MAX_MB = 2;

function LogoUploader({
  logoUrl,
  disabled,
  onUpload,
  onClear,
}: {
  logoUrl: string | null;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pickFile = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > LOGO_MAX_MB * 1024 * 1024) {
      message.error(`Logo must be under ${LOGO_MAX_MB}MB`);
      return;
    }
    setBusy(true);
    try {
      await onUpload(file);
    } catch {
      /* error already toasted */
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || busy) return;
    setBusy(true);
    try {
      await onClear();
    } catch {
      /* error already toasted */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pickFile}
      onKeyDown={(e) => e.key === 'Enter' && pickFile()}
      className={`relative flex h-28 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition hover:border-[#25395c]/50 hover:bg-[#25395c]/5 ${
        disabled || busy ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={LOGO_ACCEPT}
        onChange={(e) => void handleChange(e)}
        className="sr-only"
        aria-hidden
        tabIndex={-1}
      />
      {logoUrl ? (
        <>
          <img
            src={logoUrl}
            alt="Store logo"
            className="absolute inset-0 h-full w-full bg-white object-contain p-3"
          />
          <button
            type="button"
            onClick={(e) => void handleClear(e)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800/70 text-white transition hover:bg-slate-800"
            aria-label="Remove logo"
          >
            <CloseOutlined className="text-xs" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 px-4 text-center">
          <PictureOutlined className="text-2xl" />
          <span className="text-sm font-medium text-slate-600">
            {busy ? 'Uploading…' : 'Click to upload logo'}
          </span>
          <span className="text-xs text-slate-400">PNG, JPG, GIF or WebP · max {LOGO_MAX_MB}MB</span>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { products } = useProducts();
  const { staff } = useStaff();
  const {
    businessInfo,
    receiptSettings,
    categories,
    departments,
    roles,
    rolesLoading,
    settingsLoading,
    settingsSaving,
    entitlementGroups,
    updateBusinessInfo,
    updateReceiptSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    saveDepartmentBranch,
    updateDepartment,
    updateDepartmentBranch,
    deleteDepartment,
    saveBusinessInfo,
    saveReceiptSettings,
    uploadLogo,
    clearLogo,
    addRole,
    updateRole,
    deleteRole,
  } = useSettings();

  const isAdmin = Boolean(user && isAdminRole(user.role));

  useEffect(() => {
    if (user && !isAdminRole(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [activeSection, setActiveSection] = useState<SettingsSection>('business');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleForm] = Form.useForm();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryForm] = Form.useForm();
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingDivisionOnly, setEditingDivisionOnly] = useState(false);
  const [departmentForm] = Form.useForm();

  const canEditRoles = user ? canManageRoles(user.role, roles, user.entitlements) : false;

  if (!isAdmin) {
    return null;
  }

  const departmentTree = buildDepartmentTree(departments);
  const topLevelDepartmentCount = departmentTree.length;
  const divisionCount = departments.filter((d) => d.parentId).length;

  const productCountByCategory = (cat: ProductCategory) =>
    products.filter(
      (p) => p.categoryId === cat.id || p.category.toLowerCase() === cat.name.toLowerCase()
    ).length;

  const openCategoryModal = (cat?: ProductCategory) => {
    if (cat) {
      setEditingCategory(cat);
      categoryForm.setFieldsValue({ name: cat.name });
    } else {
      setEditingCategory(null);
      categoryForm.resetFields();
    }
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      const values = await categoryForm.validateFields();
      const name = (values.name as string).trim();
      if (editingCategory) {
        await updateCategory(editingCategory.id, name);
      } else {
        await addCategory(name);
      }
      setCategoryModalOpen(false);
    } catch {
      /* validation or API failed */
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not delete category');
    }
  };

  const openDepartmentModal = (dept?: Department) => {
    if (dept?.parentId) {
      setEditingDepartment(dept);
      setEditingDivisionOnly(true);
      departmentForm.setFieldsValue({ name: dept.name });
    } else if (dept) {
      setEditingDepartment(dept);
      setEditingDivisionOnly(false);
      departmentForm.setFieldsValue({
        name: dept.name,
        divisions: getDivisions(departments, dept.id).map((division) => ({
          id: division.id,
          name: division.name,
        })),
      });
    } else {
      setEditingDepartment(null);
      setEditingDivisionOnly(false);
      departmentForm.resetFields();
      departmentForm.setFieldsValue({ divisions: [] });
    }
    setDepartmentModalOpen(true);
  };

  const handleSaveDepartment = async () => {
    try {
      const values = await departmentForm.validateFields();
      const name = (values.name as string).trim();
      if (editingDivisionOnly && editingDepartment) {
        await updateDepartment(editingDepartment.id, { name });
      } else if (editingDepartment) {
        const divisions = (values.divisions as { id?: string; name: string }[] | undefined) ?? [];
        await updateDepartmentBranch(editingDepartment.id, { name, divisions });
      } else {
        const divisions = ((values.divisions as { name: string }[] | undefined) ?? [])
          .map((row) => row.name.trim())
          .filter(Boolean);
        await saveDepartmentBranch({ name, divisions });
      }
      setDepartmentModalOpen(false);
    } catch (e) {
      if (e instanceof Error && e.message) message.error(e.message);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    const names = collectDescendantNames(departments, id);
    const count = staff.filter((s) => s.department && names.has(s.department)).length;
    if (count > 0) {
      message.warning(
        `${count} staff member${count !== 1 ? 's are' : ' is'} assigned under this department. They will keep their assignment until updated.`
      );
    }
    try {
      await deleteDepartment(id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not delete department');
    }
  };

  const openRoleModal = (role?: RoleDefinition) => {
    if (role) {
      setEditingRole(role);
      roleForm.setFieldsValue({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      roleForm.resetFields();
      roleForm.setFieldsValue({ permissions: [] });
    }
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      const values = await roleForm.validateFields();
      const permissions = (values.permissions as Permission[]) ?? [];
      if (permissions.length === 0) {
        message.error('Select at least one permission for this role');
        return;
      }
      setRoleSaving(true);
      if (editingRole) {
        await updateRole(editingRole.id, {
          name: values.name as string,
          description: (values.description as string) ?? '',
          permissions,
        });
      } else {
        await addRole({
          name: values.name as string,
          description: (values.description as string) ?? '',
          permissions,
        });
      }
      setRoleModalOpen(false);
    } catch {
      /* validation or API failed */
    } finally {
      setRoleSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#25395c] focus:ring-2 focus:ring-[#25395c]/15';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Configuration</p>
          <Title level={2} className="!mb-1 !mt-1 !text-2xl !font-bold !tracking-tight !text-slate-900">
            Settings
          </Title>
          <Text type="secondary" className="text-sm">
            Manage your store profile, receipts, categories, departments, and team access.
          </Text>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          {/* Sidebar navigation */}
          <nav className="lg:sticky lg:top-6 lg:w-60 lg:shrink-0">
            {/* Mobile: horizontal pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'text-white shadow-md'
                        : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                    style={active ? { backgroundColor: BRAND } : undefined}
                  >
                    <Icon sx={{ fontSize: 16 }} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Desktop: vertical nav */}
            <div className="hidden rounded-2xl border border-slate-200/80 bg-white p-2 shadow-sm lg:block">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                      active ? 'bg-[#25395c]/8' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        active ? 'text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                      style={active ? { backgroundColor: BRAND } : undefined}
                    >
                      <Icon sx={{ fontSize: 18 }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${active ? 'text-[#25395c]' : 'text-slate-800'}`}
                      >
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">{item.description}</p>
                    </div>
                    {active ? (
                      <ChevronRightIcon sx={{ fontSize: 16 }} className="mt-1 shrink-0 text-[#25395c]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main content panel */}
          <div className="w-full min-w-0 flex-1">
            <div className="w-full rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
              {activeSection === 'business' ? (
                <>
                  <SectionHeader
                    title="Business profile"
                    description="Shown on receipts, invoices, and reports."
                  />
                  {settingsLoading ? (
                    <div className="py-10 text-center text-sm text-slate-400">Loading settings…</div>
                  ) : (
                    <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Store logo" icon={ImageIcon} className="sm:col-span-2">
                      <LogoUploader
                        logoUrl={businessInfo.logoUrl}
                        disabled={settingsSaving}
                        onUpload={uploadLogo}
                        onClear={clearLogo}
                      />
                    </FormField>
                    <FormField label="Business name" icon={StorefrontIcon} className="sm:col-span-2">
                      <input
                        className={inputClass}
                        value={businessInfo.name}
                        onChange={(e) => updateBusinessInfo({ name: e.target.value })}
                        placeholder="Onyx Build & Partners Limited"
                      />
                    </FormField>
                    <FormField label="Address" icon={LocationIcon} className="sm:col-span-2">
                      <textarea
                        className={`${inputClass} min-h-[80px] resize-y`}
                        rows={2}
                        value={businessInfo.address}
                        onChange={(e) => updateBusinessInfo({ address: e.target.value })}
                        placeholder="Street, city, region"
                      />
                    </FormField>
                    <FormField label="Phone" icon={PhoneIcon}>
                      <input
                        className={inputClass}
                        value={businessInfo.phone}
                        onChange={(e) => updateBusinessInfo({ phone: e.target.value })}
                        placeholder="+233 XX XXX XXXX"
                      />
                    </FormField>
                    <FormField label="Email" icon={EmailIcon}>
                      <input
                        type="email"
                        className={inputClass}
                        value={businessInfo.email}
                        onChange={(e) => updateBusinessInfo({ email: e.target.value })}
                        placeholder="info@yourstore.com"
                      />
                    </FormField>
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    Tax ID (TIN) is configured under Tax &amp; compliance.
                  </p>
                  <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                    <button
                      type="button"
                      disabled={settingsSaving}
                      onClick={() => void saveBusinessInfo()}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: BRAND }}
                    >
                      {settingsSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                    </>
                  )}
                </>
              ) : null}

              {activeSection === 'receipt' ? (
                <>
                  <SectionHeader
                    title="Receipt template"
                    description="Control what appears on printed and shared receipts."
                  />
                  {settingsLoading ? (
                    <div className="py-10 text-center text-sm text-slate-400">Loading settings…</div>
                  ) : (
                    <>
                  <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
                    <div className="space-y-3">
                      {RECEIPT_TOGGLES.map(({ key, label, description, icon: Icon }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 transition hover:border-slate-300"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                              <Icon sx={{ fontSize: 18 }} />
                            </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug text-slate-800">{label}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
                          </div>
                          </div>
                          <Switch
                            checked={receiptSettings[key]}
                            onChange={(checked) => updateReceiptSettings({ [key]: checked })}
                          />
                        </div>
                      ))}
                      <FormField label="Footer message" className="pt-2">
                        <textarea
                          className={`${inputClass} min-h-[72px] resize-y`}
                          rows={2}
                          value={receiptSettings.footerMessage}
                          onChange={(e) => updateReceiptSettings({ footerMessage: e.target.value })}
                          placeholder="Thank you for your business!"
                        />
                      </FormField>
                    </div>
                    <ReceiptPreview
                      businessName={businessInfo.name}
                      address={businessInfo.address}
                      phone={businessInfo.phone}
                      email={businessInfo.email}
                      taxId={businessInfo.taxId}
                      logoUrl={businessInfo.logoUrl}
                      footerMessage={receiptSettings.footerMessage}
                      settings={receiptSettings}
                    />
                  </div>
                  <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                    <button
                      type="button"
                      disabled={settingsSaving}
                      onClick={() => void saveReceiptSettings()}
                      className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: BRAND }}
                    >
                      {settingsSaving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                    </>
                  )}
                </>
              ) : null}

              {activeSection === 'tax' ? (
                <>
                  <SectionHeader
                    title="Tax & compliance"
                    description="Your business TIN and Ghana standard tax rates applied to sales."
                  />
                  {settingsLoading ? (
                    <div className="py-10 text-center text-sm text-slate-400">Loading settings…</div>
                  ) : (
                    <>
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="space-y-4">
                          <FormField label="Tax ID (TIN)" icon={GavelIcon}>
                            <input
                              className={inputClass}
                              value={businessInfo.taxId}
                              onChange={(e) => updateBusinessInfo({ taxId: e.target.value })}
                              placeholder="C0000000000"
                            />
                          </FormField>
                          <p className="text-xs leading-relaxed text-slate-500">
                            Used on GRA reports and optionally printed on receipts. Enable &ldquo;Tax ID
                            (TIN)&rdquo; under Receipt template to show it on receipts.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                            Ghana standard rates
                          </p>
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            <li className="flex justify-between gap-4">
                              <span>NHIL</span>
                              <span className="font-semibold">{(GHANA_TAX_RATES.nhil * 100).toFixed(1)}%</span>
                            </li>
                            <li className="flex justify-between gap-4">
                              <span>GETFund</span>
                              <span className="font-semibold">{(GHANA_TAX_RATES.getfund * 100).toFixed(1)}%</span>
                            </li>
                            <li className="flex justify-between gap-4">
                              <span>COVID levy</span>
                              <span className="font-semibold">{(GHANA_TAX_RATES.covidLevy * 100).toFixed(1)}%</span>
                            </li>
                            <li className="flex justify-between gap-4">
                              <span>VAT</span>
                              <span className="font-semibold">{(GHANA_TAX_RATES.vat * 100).toFixed(1)}%</span>
                            </li>
                          </ul>
                          <p className="mt-3 text-xs text-slate-500">
                            Applied automatically to tax-inclusive prices at checkout and in GRA reports.
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                        <button
                          type="button"
                          disabled={settingsSaving}
                          onClick={() => void saveBusinessInfo()}
                          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ backgroundColor: BRAND }}
                        >
                          {settingsSaving ? 'Saving…' : 'Save TIN'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {activeSection === 'categories' ? (
                <>
                  <SectionHeader
                    title="Product categories"
                    description="Organize inventory by shop section. Assign cashiers to categories on the Users page."
                    action={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openCategoryModal()}
                        className="!rounded-xl !font-semibold"
                        style={{ backgroundColor: BRAND }}
                      >
                        Add category
                      </Button>
                    }
                  />
                  <div className="overflow-hidden rounded-xl border border-slate-200/80">
                    {categories.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-slate-400">
                        No categories yet. Add your first shop section.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {categories.map((cat) => (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{cat.name}</p>
                              <p className="text-xs text-slate-500">
                                {productCountByCategory(cat)} product
                                {productCountByCategory(cat) !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Space size={4}>
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                className="!text-slate-500 hover:!text-slate-800"
                                onClick={() => openCategoryModal(cat)}
                              />
                              <Popconfirm
                                title="Delete this category?"
                                description="Products in this category are not deleted."
                                onConfirm={() => void handleDeleteCategory(cat.id)}
                              >
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                    <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
                    <p className="text-xs text-slate-500">Total categories</p>
                  </div>
                </>
              ) : null}

              {activeSection === 'departments' ? (
                <>
                  <SectionHeader
                    title="Departments"
                    description="Add a department (e.g. Technical, Media), then add divisions under it (e.g. Frontend, Sound)."
                    action={
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openDepartmentModal()}
                        className="!rounded-xl !font-semibold"
                        style={{ backgroundColor: BRAND }}
                      >
                        Add department
                      </Button>
                    }
                  />
                  {departmentTree.length === 0 ? (
                    <div className="rounded-xl border border-slate-200/80 px-5 py-10 text-center text-sm text-slate-400">
                      No departments yet. Add a department such as Technical or Media, then add divisions under it.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {departmentTree.map((dept) => (
                        <div
                          key={dept.id}
                          className="overflow-hidden rounded-xl border border-slate-200/80"
                        >
                          <div className="flex items-start justify-between gap-4 bg-slate-50/80 px-4 py-4 sm:px-5">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Tag color="processing" bordered={false} className="!m-0 rounded-full px-2 text-[11px] font-medium">
                                  Department
                                </Tag>
                                <p className="text-sm font-semibold text-slate-900">{dept.name}</p>
                              </div>
                              <p className="mt-1.5 text-xs text-slate-400">
                                {dept.children.length} division{dept.children.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <Space size={4} className="shrink-0" wrap>
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                className="!text-slate-500 hover:!text-slate-800"
                                onClick={() => openDepartmentModal(dept)}
                              />
                              <Popconfirm
                                title="Delete this department?"
                                description="All divisions under it will be removed too."
                                onConfirm={() => void handleDeleteDepartment(dept.id)}
                              >
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          </div>
                          {dept.children.length > 0 ? (
                            <div className="divide-y divide-slate-100 border-t border-slate-100">
                              {dept.children.map((division) => (
                                <div
                                  key={division.id}
                                  className="flex items-start justify-between gap-4 py-3.5 pl-8 pr-4 sm:pl-10 sm:pr-5"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-slate-300" aria-hidden>
                                        └
                                      </span>
                                      <Tag bordered={false} className="!m-0 rounded-full px-2 text-[10px] font-medium">
                                        Division
                                      </Tag>
                                      <p className="text-sm font-medium text-slate-800">{division.name}</p>
                                    </div>
                                  </div>
                                  <Space size={4} className="shrink-0">
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<EditOutlined />}
                                      className="!text-slate-500 hover:!text-slate-800"
                                      onClick={() => openDepartmentModal(division)}
                                    />
                                    <Popconfirm
                                      title="Delete this division?"
                                      description="Staff assigned here keep their name until edited."
                                      onConfirm={() => void handleDeleteDepartment(division.id)}
                                    >
                                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                                    </Popconfirm>
                                  </Space>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                      <p className="text-2xl font-bold text-slate-900">{topLevelDepartmentCount}</p>
                      <p className="text-xs text-slate-500">Departments</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                      <p className="text-2xl font-bold text-slate-900">{divisionCount}</p>
                      <p className="text-xs text-slate-500">Divisions</p>
                    </div>
                  </div>
                </>
              ) : null}

              {activeSection === 'roles' ? (
                <>
                  <SectionHeader
                    title="Roles & access"
                    description="Set permissions per role. Assign roles on the Users page."
                    action={
                      canEditRoles ? (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => openRoleModal()}
                          className="!rounded-xl !font-semibold"
                          style={{ backgroundColor: BRAND }}
                        >
                          Add role
                        </Button>
                      ) : null
                    }
                  />
                  {!canEditRoles ? (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <SecurityIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-sm text-amber-800">
                        Only administrators with the &ldquo;Manage roles&rdquo; permission can create or
                        edit roles.
                      </p>
                    </div>
                  ) : null}
                  <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                    {rolesLoading ? (
                      <div className="px-5 py-10 text-center text-sm text-slate-400">Loading roles…</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {roles.map((role) => (
                          <RoleRow
                            key={role.id}
                            role={role}
                            canEdit={canEditRoles}
                            onEdit={() => openRoleModal(role)}
                            onDelete={() => void deleteRole(role.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                      <p className="text-2xl font-bold text-slate-900">{roles.length}</p>
                      <p className="text-xs text-slate-500">Total roles</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                      <p className="text-2xl font-bold text-slate-900">
                        {roles.filter((r) => r.isSystem).length}
                      </p>
                      <p className="text-xs text-slate-500">System roles</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3">
                      <p className="text-2xl font-bold text-slate-900">
                        {roles.filter((r) => !r.isSystem).length}
                      </p>
                      <p className="text-xs text-slate-500">Custom roles</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <Modal
          title={editingRole ? `Edit role — ${editingRole.name}` : 'Create new role'}
          open={roleModalOpen}
          onCancel={() => setRoleModalOpen(false)}
          onOk={handleSaveRole}
          okText={editingRole ? 'Save changes' : 'Create role'}
          cancelText="Cancel"
          confirmLoading={roleSaving}
          width={680}
          destroyOnHidden
          className="settings-role-modal"
        >
          <Form form={roleForm} layout="vertical" requiredMark={false} className="mt-2">
            <Form.Item
              name="name"
              label={<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role name</span>}
              rules={[{ required: true, message: 'Role name is required' }]}
            >
              <Input placeholder="e.g. Store Manager" disabled={editingRole?.isSystem} className="!rounded-xl" />
            </Form.Item>
            <Form.Item
              name="description"
              label={<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</span>}
            >
              <Input.TextArea rows={2} placeholder="What this role is for" className="!rounded-xl" />
            </Form.Item>
            <Form.Item
              name="permissions"
              label={<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entitlements</span>}
              rules={[{ required: true, message: 'Select at least one permission' }]}
            >
              <Checkbox.Group className="w-full">
                <div className="grid gap-3 sm:grid-cols-2 max-h-[380px] overflow-y-auto pr-1">
                  {entitlementGroups.map((group) => (
                    <div
                      key={group.label}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3"
                    >
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-2">
                        {group.permissions.map((perm) => (
                          <Checkbox key={perm.key} value={perm.key} className="!items-start">
                            <span className="text-sm font-medium text-slate-800">{perm.label}</span>
                            {perm.description ? (
                              <Text type="secondary" className="block text-xs leading-snug">
                                {perm.description}
                              </Text>
                            ) : null}
                          </Checkbox>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Checkbox.Group>
            </Form.Item>
            {editingRole?.isSystem ? (
              <p className="text-xs text-slate-500">
                System role names are fixed, but you can update their entitlements.
              </p>
            ) : null}
          </Form>
        </Modal>

        <Modal
          title={editingCategory ? `Edit category — ${editingCategory.name}` : 'Add category'}
          open={categoryModalOpen}
          onCancel={() => setCategoryModalOpen(false)}
          onOk={() => void handleSaveCategory()}
          okText={editingCategory ? 'Save changes' : 'Add category'}
          cancelText="Cancel"
          destroyOnHidden
        >
          <Form form={categoryForm} layout="vertical" requiredMark={false} className="mt-2">
            <Form.Item
              name="name"
              label={<span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category name</span>}
              rules={[{ required: true, message: 'Category name is required' }]}
            >
              <Input placeholder="e.g. Lighting" className="!rounded-xl" />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          title={
            editingDivisionOnly && editingDepartment
              ? `Edit division — ${editingDepartment.name}`
              : editingDepartment
                ? `Edit department — ${editingDepartment.name}`
                : 'Add department'
          }
          open={departmentModalOpen}
          onCancel={() => setDepartmentModalOpen(false)}
          onOk={() => void handleSaveDepartment()}
          okText={
            editingDivisionOnly
              ? 'Save changes'
              : editingDepartment
                ? 'Save changes'
                : 'Add department'
          }
          cancelText="Cancel"
          destroyOnHidden
        >
          <Form form={departmentForm} layout="vertical" requiredMark={false} className="mt-2">
            <Form.Item
              name="name"
              label={
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {editingDivisionOnly ? 'Division name' : 'Department name'}
                </span>
              }
              rules={[{ required: true, message: 'Name is required' }]}
            >
              <Input
                placeholder={
                  editingDivisionOnly
                    ? 'e.g. Frontend, Sound, Control Room'
                    : 'e.g. Technical, Media'
                }
                className="!rounded-xl"
              />
            </Form.Item>

            {!editingDivisionOnly ? (
              <Form.List name="divisions">
                {(fields, { add, remove }) => (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Divisions
                    </span>
                    {fields.map((field) => (
                      <div key={field.key} className="flex items-start gap-2">
                        <Form.Item name={[field.name, 'id']} hidden>
                          <Input />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, 'name']}
                          className="!mb-0 flex-1"
                          rules={[{ required: true, message: 'Division name is required' }]}
                        >
                          <Input placeholder="e.g. Frontend, Sound" className="!rounded-xl" />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          className="!mt-1"
                          onClick={() => remove(field.name)}
                          aria-label="Remove division"
                        />
                      </div>
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => add()}
                      className="!rounded-xl"
                      block
                    >
                      Add division
                    </Button>
                  </div>
                )}
              </Form.List>
            ) : null}
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
