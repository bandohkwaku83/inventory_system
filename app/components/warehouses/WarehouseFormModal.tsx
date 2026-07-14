'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, Switch, message } from 'antd';
import { useWarehouses } from '../../context/WarehousesContext';
import {
  suggestWarehouseCode,
  type CreateWarehousePayload,
  type Warehouse,
} from '../../lib/warehousesApi';
import { fetchUsers, type SystemUserRow } from '../../lib/usersApi';

const { TextArea } = Input;

export type WarehouseFormValues = {
  code: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  phone: string;
  isDefault?: boolean;
  status: 'active' | 'inactive';
  managerId?: string | null;
};

type Props = {
  open: boolean;
  editing: Warehouse | null;
  onClose: () => void;
  onSaved?: (warehouse: Warehouse) => void;
};

export function WarehouseFormModal({ open, editing, onClose, onSaved }: Props) {
  const { meta, addWarehouse, updateWarehouse } = useWarehouses();
  const [form] = Form.useForm<WarehouseFormValues>();
  const [saving, setSaving] = useState(false);
  const [codeTouched, setCodeTouched] = useState(false);
  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const nameValue = Form.useWatch('name', form);

  useEffect(() => {
    if (!open) return;
    setCodeTouched(Boolean(editing));
    if (editing) {
      form.setFieldsValue({
        code: editing.code,
        name: editing.name,
        description: editing.description,
        address: editing.address,
        city: editing.city,
        phone: editing.phone,
        isDefault: editing.isDefault,
        status: editing.status,
        managerId: editing.managerId ?? editing.manager?.id ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'active', isDefault: false, managerId: undefined });
    }
  }, [open, editing, form]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setUsersLoading(true);
    void fetchUsers()
      .then((list) => {
        if (!cancelled) setUsers(list.filter((u) => u.active));
      })
      .catch(() => {
        if (!cancelled) {
          setUsers([]);
          message.error('Could not load users for manager picker');
        }
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || editing || codeTouched) return;
    if (typeof nameValue === 'string' && nameValue.trim()) {
      form.setFieldsValue({ code: suggestWarehouseCode(nameValue) });
    }
  }, [nameValue, open, editing, codeTouched, form]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload: CreateWarehousePayload = {
        code: values.code,
        name: values.name,
        description: values.description,
        address: values.address,
        city: values.city,
        phone: values.phone,
        isDefault: Boolean(values.isDefault),
        status: values.status,
        managerId: values.managerId || null,
      };
      const saved = editing
        ? await updateWarehouse(editing.id, payload)
        : await addWarehouse(payload);
      message.success(editing ? 'Warehouse updated' : `Warehouse ${saved.code} created`);
      onSaved?.(saved);
      onClose();
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit warehouse' : 'Create warehouse'}
      open={open}
      onCancel={onClose}
      onOk={() => void save()}
      confirmLoading={saving}
      okText={editing ? 'Save changes' : 'Create'}
      width={560}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="East Warehouse" />
        </Form.Item>
        <Form.Item
          name="code"
          label="Code"
          rules={[{ required: true, message: 'Code is required' }]}
          extra={!editing ? 'Auto-generated from name — edit to override' : undefined}
        >
          <Input
            className="font-mono"
            placeholder="WH-EAST"
            disabled={Boolean(editing)}
            onChange={() => setCodeTouched(true)}
          />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="Optional notes" />
        </Form.Item>
        <Form.Item
          name="managerId"
          label="Manager"
          extra="Optional — who oversees this warehouse"
        >
          <Select
            allowClear
            showSearch
            loading={usersLoading}
            placeholder="Select a user"
            optionFilterProp="label"
            options={users.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.email})`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="address"
          label="Address"
          rules={[{ required: true, message: 'Address is required' }]}
        >
          <Input placeholder="Street address" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name="city"
              label="City"
              rules={[{ required: true, message: 'City is required' }]}
            >
              <Input placeholder="Accra" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Phone"
              rules={[{ required: true, message: 'Phone is required' }]}
            >
              <Input placeholder="0200000000" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="status" label="Status" rules={[{ required: true }]}>
              <Select
                options={(meta.statuses ?? ['active', 'inactive']).map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isDefault" label="Default warehouse" valuePropName="checked">
              <Switch checkedChildren="Yes" unCheckedChildren="No" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item shouldUpdate={(prev, next) => prev.isDefault !== next.isDefault} noStyle>
          {() =>
            form.getFieldValue('isDefault') ? (
              <p className="mb-0 -mt-2 text-xs text-slate-500">
                This becomes the single default warehouse for the business.
              </p>
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
}
