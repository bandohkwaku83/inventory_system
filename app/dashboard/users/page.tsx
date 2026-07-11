'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Tag,
  Popconfirm,
  Spin,
} from 'antd';
import type { TableProps } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  useUsers,
  roleLabel,
  hasFullCatalogAccess,
  type SystemUser,
  type UserRole,
} from '../../context/UsersContext';
import { useSettings } from '../../context/SettingsContext';
import { useStaff } from '../../context/StaffContext';
import { roleRequiresCategoryAssignment } from '../../lib/permissions';
import { resolveRoleApiId } from '../../lib/rolesApi';

const { Title, Text } = Typography;

export default function SystemUsersPage() {
  const { users, usersLoading, addUser, updateUser, deleteUser } = useUsers();
  const { categories, roles } = useSettings();
  const { staff, staffLoading } = useStaff();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const categoryOptions = categories.map((c) => ({ label: c.name, value: c.id }));

  const linkedStaffIds = useMemo(() => {
    const ids = new Set<string>();
    for (const u of users) {
      if (u.staffId) ids.add(u.staffId);
    }
    return ids;
  }, [users]);

  const staffOptions = useMemo(() => {
    const editingUser = editingId ? users.find((u) => u.id === editingId) : null;
    return staff
      .filter((s) => {
        if (s.status !== 'active') return false;
        if (editingUser?.staffId === s.id) return true;
        return !linkedStaffIds.has(s.id);
      })
      .map((s) => ({
        value: s.id,
        label: `${s.name}${s.employeeNumber ? ` (${s.employeeNumber})` : ''}${s.email ? ` — ${s.email}` : ''}`,
        email: s.email,
      }));
  }, [editingId, linkedStaffIds, staff, users]);

  const columns: TableProps<SystemUser>['columns'] = useMemo(
    () => [
      {
        title: 'User',
        key: 'user',
        render: (_: unknown, r: SystemUser) => {
          const linked = r.staffId ? staff.find((s) => s.id === r.staffId) : undefined;
          return (
            <Space direction="vertical" size={0}>
              <span className="text-sm font-semibold">{r.name}</span>
              <span className="text-xs text-slate-500">{r.email}</span>
              {linked?.employeeNumber ? (
                <span className="text-xs text-slate-400">Staff #{linked.employeeNumber}</span>
              ) : null}
            </Space>
          );
        },
      },
      {
        title: 'Role',
        dataIndex: 'role',
        key: 'role',
        render: (v: UserRole) => (
          <Tag color={v === 'admin' ? 'purple' : v === 'gra_reporter' ? 'blue' : 'cyan'}>
            {roleLabel(v, roles)}
          </Tag>
        ),
      },
      {
        title: 'Categories',
        key: 'categories',
        render: (_: unknown, r: SystemUser) => {
          if (hasFullCatalogAccess(r.role, r.categoryIds, roles)) {
            return <span className="text-xs text-slate-400">All sections</span>;
          }
          const names = r.categoryIds
            .map((id) => categories.find((c) => c.id === id)?.name ?? id)
            .join(', ');
          return <span className="text-xs">{names || '—'}</span>;
        },
      },
      {
        title: 'Active',
        dataIndex: 'active',
        key: 'active',
        render: (_: boolean, r: SystemUser) => (
          <Switch
            checked={r.active}
            onChange={(checked) => void updateUser(r.id, { active: checked })}
            size="small"
          />
        ),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_: unknown, r: SystemUser) => (
          <Space size="small">
            <Button
              size="small"
              onClick={() => {
                setEditingId(r.id);
                form.setFieldsValue({
                  staffId: r.staffId ?? undefined,
                  email: r.email,
                  role: r.role,
                  categoryIds: r.categoryIds,
                  password: undefined,
                });
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this user?"
              description="This cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => void deleteUser(r.id)}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [categories, deleteUser, form, roles, staff, updateUser]
  );

  const handleOpen = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ role: 'cashier', categoryIds: [], active: true });
    setOpen(true);
  };

  const handleStaffChange = (staffId: string) => {
    const member = staff.find((s) => s.id === staffId);
    if (member?.email && !editingId) {
      form.setFieldsValue({ email: member.email });
    }
  };

  const handleSave = () => {
    void form.validateFields().then(async (values) => {
      const roleDef = roles.find((r) => r.id === values.role);
      const roleId = roleDef ? resolveRoleApiId(roleDef) : (values.role as string);
      const categoryIds = (values.categoryIds as string[]) ?? [];
      const staffId = values.staffId as string;

      setSaving(true);
      try {
        if (editingId) {
          const patch: Parameters<typeof updateUser>[1] = {
            staffId,
            email: (values.email as string).trim().toLowerCase(),
            roleId,
            categoryIds,
          };
          const password = (values.password as string | undefined)?.trim();
          if (password) patch.password = password;
          await updateUser(editingId, patch);
        } else {
          await addUser({
            staffId,
            email: (values.email as string).trim().toLowerCase(),
            password: values.password as string,
            roleId,
            categoryIds,
            active: true,
          });
        }
        setOpen(false);
      } catch {
        /* errors shown via context */
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            System Users
          </Title>
          <Text type="secondary">
            Link login accounts to staff members, assign roles, and control shop section access.
          </Text>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <Text type="secondary" className="text-sm">
              {users.length} user{users.length !== 1 ? 's' : ''}
            </Text>
            <Button type="primary" onClick={handleOpen}>
              Add user
            </Button>
          </div>
          <div className="p-2 sm:p-3 overflow-x-auto">
            <Spin spinning={usersLoading || staffLoading}>
              <Table<SystemUser>
                rowKey="id"
                columns={columns}
                dataSource={users}
                pagination={false}
                size="small"
                scroll={{ x: 900 }}
              />
            </Spin>
          </div>
        </Card>

        <Modal
          title={editingId ? 'Edit user' : 'Add user'}
          open={open}
          onCancel={() => setOpen(false)}
          onOk={handleSave}
          okText={editingId ? 'Update' : 'Create'}
          cancelText="Cancel"
          confirmLoading={saving}
          destroyOnHidden
          width={480}
        >
          <Form form={form} layout="vertical" requiredMark={false} className="mt-2">
            <Form.Item
              name="staffId"
              label="Staff member"
              rules={[{ required: true, message: 'Select a staff member' }]}
              extra="Display name is taken from the linked staff record."
            >
              <Select
                showSearch
                placeholder="Select active staff"
                options={staffOptions}
                optionFilterProp="label"
                onChange={handleStaffChange}
                notFoundContent={
                  staffLoading
                    ? 'Loading staff…'
                    : 'No available staff — add active staff first, or all are already linked.'
                }
              />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
            >
              <Input placeholder="cashier@shop.com" autoComplete="off" />
            </Form.Item>
            <Form.Item
              name="password"
              label={editingId ? 'New password' : 'Password'}
              rules={
                editingId
                  ? [{ min: 6, message: 'At least 6 characters' }]
                  : [
                      { required: true, message: 'Password required' },
                      { min: 6, message: 'At least 6 characters' },
                    ]
              }
              extra={editingId ? 'Leave blank to keep the current password.' : undefined}
            >
              <Input.Password
                placeholder={editingId ? 'Leave blank to keep current' : 'Min. 6 characters'}
                autoComplete="new-password"
              />
            </Form.Item>
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select
                options={roles.map((r) => ({
                  value: r.id,
                  label: `${r.name}${r.description ? ` — ${r.description}` : ''}`,
                }))}
              />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.role !== cur.role}>
              {({ getFieldValue }) => {
                const selectedRole = getFieldValue('role') as UserRole;
                const needsCategories =
                  selectedRole && roleRequiresCategoryAssignment(selectedRole, roles);
                return needsCategories ? (
                  <Form.Item
                    name="categoryIds"
                    label="Assigned categories"
                    extra="Select one or more shop sections this user can access."
                  >
                    <Select
                      mode="multiple"
                      placeholder="e.g. Lighting, Sanitary Ware"
                      options={categoryOptions}
                      allowClear
                    />
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
