'use client';

import React, { useRef, useState } from 'react';
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
} from '@mui/icons-material';
import {
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined, CloseOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import type { ReceiptSettings } from '../../context/SettingsContext';
import {
  canManageRoles,
  type Permission,
  type RoleDefinition,
} from '../../lib/permissions';

const { Text, Title } = Typography;

const BRAND = '#25395c';

type SettingsSection = 'business' | 'receipt' | 'roles';

const NAV_ITEMS: {
  id: SettingsSection;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: 'business',
    label: 'Business profile',
    description: 'Store name, contact & tax details',
    icon: BusinessIcon,
  },
  {
    id: 'receipt',
    label: 'Receipt template',
    description: 'What appears on printed receipts',
    icon: ReceiptIcon,
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
    'showLogo' | 'showAddress' | 'showPhone' | 'showEmail'
  >;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  { key: 'showLogo', label: 'Store logo', description: 'Display your logo at the top', icon: ImageIcon },
  { key: 'showAddress', label: 'Address', description: 'Show business address on receipt', icon: LocationIcon },
  { key: 'showPhone', label: 'Phone number', description: 'Include contact phone', icon: PhoneIcon },
  { key: 'showEmail', label: 'Email address', description: 'Include contact email', icon: EmailIcon },
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
    <div className="mb-6 border-b border-slate-200/80 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon sx={{ fontSize: 14 }} className="text-slate-400" /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}

function ReceiptPreview({
  businessName,
  address,
  phone,
  email,
  logoUrl,
  footerMessage,
  settings,
}: {
  businessName: string;
  address: string;
  phone: string;
  email: string;
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
  const {
    businessInfo,
    receiptSettings,
    roles,
    rolesLoading,
    settingsLoading,
    settingsSaving,
    entitlementGroups,
    updateBusinessInfo,
    updateReceiptSettings,
    saveBusinessInfo,
    saveReceiptSettings,
    uploadLogo,
    clearLogo,
    addRole,
    updateRole,
    deleteRole,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SettingsSection>('business');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleForm] = Form.useForm();

  const canEditRoles = user ? canManageRoles(user.role, roles, user.entitlements) : false;

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
            Manage your store profile, receipts, and team access in one place.
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
          <div className="min-w-0 flex-1">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
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
      </div>
    </DashboardLayout>
  );
}
