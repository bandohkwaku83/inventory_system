'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  AppstoreOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { WarehouseFormModal } from '../../../components/warehouses/WarehouseFormModal';
import { LocationsPanel } from '../../../components/warehouses/LocationsPanel';
import { InventoryPanel } from '../../../components/warehouses/InventoryPanel';
import { HistoryPanel } from '../../../components/warehouses/HistoryPanel';
import { useWarehouses } from '../../../context/WarehousesContext';
import { useActionLoader } from '../../../components/LoaderProvider';
import { BRAND } from '../../../lib/brand';
import {
  fetchWarehouseById,
  fetchWarehouseInventory,
  fetchWarehouseStructure,
  type LocationNode,
  type Warehouse,
  type WarehouseInventoryItem,
} from '../../../lib/warehousesApi';

const { Title, Text } = Typography;

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? '');
  const { meta, updateWarehouse, deleteWarehouse, getWarehouse, refreshWarehouses } =
    useWarehouses();
  const { runWithLoader } = useActionLoader();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [formOpen, setFormOpen] = useState(false);

  const [structure, setStructure] = useState<LocationNode[]>([]);
  const [flat, setFlat] = useState<LocationNode[]>([]);
  const [structureLoading, setStructureLoading] = useState(false);

  const [inventory, setInventory] = useState<WarehouseInventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryTotal, setInventoryTotal] = useState(0);

  const [overviewForm] = Form.useForm();
  const [savingOverview, setSavingOverview] = useState(false);

  const stockQty = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
  const deleteBlockedReason =
    stockQty > 0
      ? `This warehouse has ${stockQty} units of stock. Move or clear stock before deleting.`
      : null;

  const loadWarehouse = useCallback(async () => {
    setLoading(true);
    try {
      const cached = getWarehouse(id);
      if (cached) setWarehouse(cached);
      const wh = await fetchWarehouseById(id);
      setWarehouse(wh);
      overviewForm.setFieldsValue({
        name: wh.name,
        code: wh.code,
        address: wh.address,
        city: wh.city,
        phone: wh.phone,
        description: wh.description,
        status: wh.status,
        isDefault: wh.isDefault,
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Warehouse not found');
      setWarehouse(null);
    } finally {
      setLoading(false);
    }
  }, [id, getWarehouse, overviewForm]);

  const loadStructure = useCallback(async () => {
    setStructureLoading(true);
    try {
      const data = await fetchWarehouseStructure(id);
      setStructure(data.structure);
      setFlat(data.flat.map((l) => ({ ...l, children: [] })));
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load locations');
      setStructure([]);
      setFlat([]);
    } finally {
      setStructureLoading(false);
    }
  }, [id]);

  const loadInventory = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const data = await fetchWarehouseInventory(id, { page: 1, limit: 200 });
      setInventory(data.items);
      setInventoryTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load inventory');
      setInventory([]);
      setInventoryTotal(0);
    } finally {
      setInventoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    void loadWarehouse();
    void loadStructure();
    void loadInventory();
  }, [id, loadWarehouse, loadStructure, loadInventory]);

  const saveOverview = async () => {
    if (!warehouse) return;
    try {
      const values = await overviewForm.validateFields();
      setSavingOverview(true);
      const updated = await updateWarehouse(warehouse.id, {
        name: values.name,
        address: values.address,
        city: values.city,
        phone: values.phone,
        description: values.description,
        status: values.status,
        isDefault: values.isDefault,
      });
      setWarehouse(updated);
      message.success('Warehouse updated');
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
    } finally {
      setSavingOverview(false);
    }
  };

  const handleDelete = async () => {
    if (!warehouse) return;
    if (stockQty > 0) {
      message.error(deleteBlockedReason ?? 'Cannot delete warehouse with stock');
      return;
    }
    try {
      await runWithLoader(async () => {
        await deleteWarehouse(warehouse.id);
        message.success('Warehouse deleted');
        await refreshWarehouses();
        router.push('/dashboard/warehouses');
      });
    } catch {
      /* 409 */
    }
  };

  if (!loading && !warehouse) {
    return (
      <DashboardLayout>
        <Card>
          <Text type="secondary">Warehouse not found.</Text>
          <div className="mt-3">
            <Button onClick={() => router.push('/dashboard/warehouses')}>Back to list</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              type="link"
              className="!px-0"
              icon={<ArrowLeftOutlined />}
              onClick={() => router.push('/dashboard/warehouses')}
            >
              Warehouses
            </Button>
            <Title level={3} className="!mb-1 !mt-1">
              {warehouse ? (
                <>
                  <span className="font-mono text-lg" style={{ color: BRAND }}>
                    {warehouse.code}
                  </span>
                  <span className="mx-2 text-slate-300">·</span>
                  {warehouse.name}
                </>
              ) : (
                'Loading…'
              )}
            </Title>
            {warehouse && (
              <Space size="small">
                <Tag color={warehouse.status === 'active' ? 'success' : 'default'}>
                  {warehouse.status}
                </Tag>
                {warehouse.isDefault && <Tag color="blue">Default</Tag>}
              </Space>
            )}
          </div>
          <Space>
            <Button
              icon={<EditOutlined />}
              disabled={!warehouse}
              onClick={() => setFormOpen(true)}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete warehouse?"
              description={
                deleteBlockedReason ??
                'This permanently removes the warehouse if it has no stock.'
              }
              disabled={Boolean(deleteBlockedReason)}
              onConfirm={() => void handleDelete()}
              okText="Delete"
              okButtonProps={{ danger: true, disabled: Boolean(deleteBlockedReason) }}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!warehouse || Boolean(deleteBlockedReason)}
              >
                Delete
              </Button>
            </Popconfirm>
          </Space>
        </div>

        {deleteBlockedReason && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {deleteBlockedReason}
          </div>
        )}

        <Card loading={loading} className="w-full min-w-0">
          <Tabs
            className="w-full min-w-0 [&_.ant-tabs-content-holder]:min-w-0 [&_.ant-tabs-content]:w-full [&_.ant-tabs-tabpane]:w-full"
            activeKey={tab}
            onChange={setTab}
            items={[
              {
                key: 'overview',
                label: (
                  <span>
                    <AppstoreOutlined /> Overview
                  </span>
                ),
                children: warehouse && (
                  <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <Form
                      form={overviewForm}
                      layout="vertical"
                      className="w-full min-w-0 max-w-2xl"
                      onFinish={() => void saveOverview()}
                    >
                      <Form.Item name="code" label="Code">
                        <Input className="w-full font-mono" disabled />
                      </Form.Item>
                      <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Name is required' }]}
                      >
                        <Input className="w-full" />
                      </Form.Item>
                      <Form.Item
                        name="address"
                        label="Address"
                        rules={[{ required: true, message: 'Address is required' }]}
                      >
                        <Input className="w-full" />
                      </Form.Item>
                      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item
                          name="city"
                          label="City"
                          rules={[{ required: true, message: 'City is required' }]}
                        >
                          <Input className="w-full" />
                        </Form.Item>
                        <Form.Item
                          name="phone"
                          label="Phone"
                          rules={[{ required: true, message: 'Phone is required' }]}
                        >
                          <Input className="w-full" />
                        </Form.Item>
                      </div>
                      <Form.Item name="description" label="Description">
                        <Input.TextArea className="w-full" rows={2} />
                      </Form.Item>
                      <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                        <Select
                          className="w-full"
                          options={(meta.statuses ?? ['active', 'inactive']).map((s) => ({
                            value: s,
                            label: s.charAt(0).toUpperCase() + s.slice(1),
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name="isDefault"
                        label="Default warehouse"
                        valuePropName="checked"
                        extra="Only one warehouse can be the default."
                      >
                        <Switch />
                      </Form.Item>
                      <Button type="primary" htmlType="submit" loading={savingOverview}>
                        Save changes
                      </Button>
                    </Form>

                    <div className="h-fit rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                      <Text strong className="mb-3 block text-sm text-slate-800">
                        Summary
                      </Text>
                      <dl className="space-y-3 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-slate-500">Manager</dt>
                          <dd className="text-right font-semibold text-slate-800">
                            {warehouse.manager?.name ||
                              warehouse.manager?.email ||
                              '—'}
                          </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-slate-500">Stock rows</dt>
                          <dd className="font-semibold text-slate-800">{inventoryTotal}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-slate-500">Units in warehouse</dt>
                          <dd className="font-semibold text-slate-800">{stockQty}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <dt className="text-slate-500">Locations</dt>
                          <dd className="font-semibold text-slate-800">{flat.length}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                ),
              },
              {
                key: 'locations',
                label: (
                  <span>
                    <EnvironmentOutlined /> Locations
                  </span>
                ),
                children: (
                  <LocationsPanel
                    warehouseId={id}
                    meta={meta}
                    structure={structure}
                    flat={flat}
                    loading={structureLoading}
                    onRefresh={loadStructure}
                  />
                ),
              },
              {
                key: 'inventory',
                label: (
                  <span>
                    <InboxOutlined /> Inventory
                  </span>
                ),
                children: (
                  <InventoryPanel
                    warehouseId={id}
                    warehouseActive={warehouse?.status === 'active'}
                    meta={meta}
                    structure={structure}
                    items={inventory}
                    loading={inventoryLoading}
                    total={inventoryTotal}
                    onRefresh={async () => {
                      await loadInventory();
                      if (structure.length === 0) await loadStructure();
                    }}
                  />
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined /> History
                  </span>
                ),
                children: <HistoryPanel warehouseId={id} />,
              },
            ]}
          />
        </Card>
      </div>

      <WarehouseFormModal
        open={formOpen}
        editing={warehouse}
        onClose={() => setFormOpen(false)}
        onSaved={(wh) => {
          setWarehouse(wh);
          overviewForm.setFieldsValue({
            name: wh.name,
            code: wh.code,
            address: wh.address,
            city: wh.city,
            phone: wh.phone,
            description: wh.description,
            status: wh.status,
            isDefault: wh.isDefault,
          });
        }}
      />
    </DashboardLayout>
  );
}
