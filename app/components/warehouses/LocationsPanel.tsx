'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Empty,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Tree,
  Typography,
  message,
} from 'antd';
import type { TreeDataNode } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useActionLoader } from '../LoaderProvider';
import { BRAND } from '../../lib/brand';
import {
  createWarehouseLocation,
  deleteWarehouseLocation,
  findLocationNode,
  suggestLocationCode,
  updateWarehouseLocation,
  type LocationNode,
  type LocationType,
  type WarehousesMeta,
} from '../../lib/warehousesApi';

const { Text } = Typography;

const SIMPLE_TYPES: LocationType[] = ['zone', 'bin'];

type LocationFormValues = {
  type: LocationType;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
};

type Props = {
  warehouseId: string;
  meta: WarehousesMeta;
  structure: LocationNode[];
  flat: LocationNode[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

function typeColor(type: LocationType): string {
  switch (type) {
    case 'zone':
      return 'blue';
    case 'bin':
      return 'green';
    case 'aisle':
      return 'cyan';
    case 'rack':
      return 'purple';
    case 'shelf':
      return 'geekblue';
    default:
      return 'default';
  }
}

function toTreeData(
  nodes: LocationNode[],
  selectedId: string | null
): TreeDataNode[] {
  return nodes.map((n) => ({
    key: n.id,
    title: (
      <span
        className={`inline-flex items-center gap-2 ${selectedId === n.id ? 'font-semibold' : ''}`}
      >
        <Tag color={typeColor(n.type)} className="!m-0 !text-[10px] uppercase">
          {n.type}
        </Tag>
        <span className="font-mono text-xs" style={{ color: BRAND }}>
          {n.fullPath || n.code}
        </span>
        <span className="text-sm text-slate-700">{n.name}</span>
      </span>
    ),
    children: n.children.length ? toTreeData(n.children, selectedId) : undefined,
  }));
}

export function LocationsPanel({
  warehouseId,
  meta,
  structure,
  flat,
  loading,
  onRefresh,
}: Props) {
  const { runWithLoader } = useActionLoader();
  const [advanced, setAdvanced] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [form] = Form.useForm<LocationFormValues>();
  const [codeTouched, setCodeTouched] = useState(false);
  const nameValue = Form.useWatch('name', form);
  const typeValue = Form.useWatch('type', form) as LocationType | undefined;

  const selected = useMemo(
    () => (selectedId ? findLocationNode(structure, selectedId) : null),
    [structure, selectedId]
  );

  const visibleTypes = useMemo(() => {
    if (advanced) return meta.locationTypes?.length ? meta.locationTypes : SIMPLE_TYPES;
    return SIMPLE_TYPES.filter((t) => (meta.locationTypes ?? SIMPLE_TYPES).includes(t));
  }, [advanced, meta.locationTypes]);

  const parentOptions = useMemo(() => {
    const type = typeValue ?? 'bin';
    const allowed = meta.allowedParents[type] ?? [null];
    const allowedTypes = allowed.filter((t): t is LocationType => t !== null);
    return flat
      .filter((l) => allowedTypes.includes(l.type) && l.id !== selectedId)
      .map((l) => ({
        value: l.id,
        label: `${l.fullPath || l.code} — ${l.name} (${l.type})`,
      }));
  }, [flat, meta.allowedParents, typeValue, selectedId]);

  const allowNullParent = (meta.allowedParents[typeValue ?? 'bin'] ?? [null]).includes(null);

  const startCreate = (preferred?: LocationType) => {
    setMode('create');
    setSelectedId(null);
    setCodeTouched(false);
    const type = preferred ?? (structure.length === 0 ? 'zone' : 'bin');
    form.resetFields();
    form.setFieldsValue({ type, isActive: true });
  };

  const startEdit = (node: LocationNode) => {
    setMode('edit');
    setSelectedId(node.id);
    setCodeTouched(true);
    form.setFieldsValue({
      type: node.type,
      code: node.code,
      name: node.name,
      description: node.description,
      parentId: node.parentId ?? undefined,
      isActive: node.isActive,
    });
    if (!SIMPLE_TYPES.includes(node.type)) setAdvanced(true);
  };

  useEffect(() => {
    if (mode !== 'create' || codeTouched) return;
    if (typeof nameValue === 'string' && nameValue.trim()) {
      form.setFieldsValue({
        code: suggestLocationCode(typeValue ?? 'bin', nameValue),
      });
    }
  }, [nameValue, typeValue, mode, codeTouched, form]);

  const save = async () => {
    try {
      const values = await form.validateFields();
      await runWithLoader(async () => {
        if (mode === 'edit' && selectedId) {
          await updateWarehouseLocation(warehouseId, selectedId, {
            code: values.code,
            name: values.name,
            description: values.description,
            parentId: values.parentId ?? null,
            isActive: values.isActive,
          });
          message.success('Location updated');
        } else {
          await createWarehouseLocation(warehouseId, {
            type: values.type,
            code: values.code,
            name: values.name,
            description: values.description,
            parentId: values.parentId || null,
          });
          message.success(`${values.type === 'zone' ? 'Zone' : 'Location'} created`);
        }
        await onRefresh();
        if (mode === 'create') startCreate(values.type === 'zone' ? 'bin' : 'zone');
      });
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (selected.children.length > 0) {
      message.error('Remove or move child locations before deleting this one.');
      return;
    }
    try {
      await runWithLoader(async () => {
        await deleteWarehouseLocation(warehouseId, selected.id);
        message.success('Location deleted');
        setSelectedId(null);
        startCreate();
        await onRefresh();
      });
    } catch {
      /* toast from API */
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <Text strong>Locations</Text>
            <Text type="secondary" className="mt-0.5 block text-xs">
              Simple layout: Zone → Bin
            </Text>
          </div>
          <Space wrap>
            <Button size="small" icon={<PlusOutlined />} onClick={() => startCreate('zone')}>
              Zone
            </Button>
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => startCreate('bin')}
            >
              Bin
            </Button>
          </Space>
        </div>

        {loading ? (
          <Empty description="Loading…" />
        ) : structure.length === 0 ? (
          <Empty
            description="No locations yet. Add a zone, then bins under it."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => startCreate('zone')}>
              Add first zone
            </Button>
          </Empty>
        ) : (
          <Tree
            showLine
            defaultExpandAll
            selectedKeys={selectedId ? [selectedId] : []}
            treeData={toTreeData(structure, selectedId)}
            onSelect={(keys) => {
              const id = String(keys[0] ?? '');
              if (!id) {
                startCreate();
                return;
              }
              const node = findLocationNode(structure, id);
              if (node) startEdit(node);
            }}
          />
        )}
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Text strong>{mode === 'edit' ? 'Edit location' : 'New location'}</Text>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <Switch size="small" checked={advanced} onChange={setAdvanced} />
            Advanced types
          </label>
        </div>

        <Form form={form} layout="vertical" onFinish={() => void save()}>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select
              disabled={mode === 'edit'}
              options={visibleTypes.map((t) => ({
                value: t,
                label: t.charAt(0).toUpperCase() + t.slice(1),
              }))}
            />
          </Form.Item>
          {mode === 'edit' && (
            <Text type="secondary" className="mb-3 -mt-2 block text-xs">
              Type is fixed after create.
            </Text>
          )}
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder={typeValue === 'zone' ? 'Receiving' : 'Receiving Bin 01'} />
          </Form.Item>
          <Form.Item
            name="code"
            label="Code"
            rules={[{ required: true, message: 'Code is required' }]}
            extra={mode === 'create' ? 'Auto from name — override if needed' : undefined}
          >
            <Input
              className="font-mono"
              placeholder="RECV"
              onChange={() => setCodeTouched(true)}
            />
          </Form.Item>
          {(allowNullParent || parentOptions.length > 0) && (
            <Form.Item
              name="parentId"
              label="Parent"
              rules={
                allowNullParent || mode === 'edit'
                  ? []
                  : [{ required: true, message: 'Pick a parent' }]
              }
            >
              <Select
                allowClear={allowNullParent}
                placeholder={allowNullParent ? 'None (top-level)' : 'Select parent'}
                options={parentOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional" />
          </Form.Item>
          {mode === 'edit' && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <Space wrap>
            <Button type="primary" htmlType="submit">
              {mode === 'edit' ? 'Save location' : 'Create location'}
            </Button>
            {mode === 'edit' && selected && (
              <>
                <Button icon={<EditOutlined />} onClick={() => startCreate('bin')}>
                  New instead
                </Button>
                <Popconfirm
                  title="Delete location?"
                  description={
                    selected.children.length > 0
                      ? 'This location has children and cannot be deleted.'
                      : 'This cannot be undone.'
                  }
                  disabled={selected.children.length > 0}
                  onConfirm={() => void remove()}
                  okText="Delete"
                  okButtonProps={{ danger: true, disabled: selected.children.length > 0 }}
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={selected.children.length > 0}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
          {mode === 'edit' && selected && selected.children.length > 0 && (
            <Text type="secondary" className="mt-2 block text-xs">
              Delete is blocked while this location has child locations.
            </Text>
          )}
        </Form>
      </div>
    </div>
  );
}
