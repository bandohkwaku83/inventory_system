'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Table,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useWarehouses } from '../../context/WarehousesContext';
import {
  binsFromStructure,
  fetchWarehouseInventory,
  fetchWarehouseStructure,
  type LocationNode,
  type WarehouseInventoryItem,
} from '../../lib/warehousesApi';
import {
  createGoodsIssue,
  type GoodsIssueLineInput,
} from '../../lib/goodsIssuesApi';
import { BRAND } from '../../lib/brand';

const { Title, Text } = Typography;

type DraftLine = {
  key: string;
  productId: string;
  quantity: number;
  locationId?: string;
};

type StockOption = {
  productId: string;
  label: string;
  sku: string;
  available: number;
};

function newLineKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function aggregateStock(items: WarehouseInventoryItem[]): StockOption[] {
  const byProduct = new Map<string, StockOption>();
  for (const item of items) {
    if (!item.productId || item.quantity <= 0) continue;
    const existing = byProduct.get(item.productId);
    if (existing) {
      existing.available += item.quantity;
    } else {
      byProduct.set(item.productId, {
        productId: item.productId,
        label: item.productName,
        sku: item.sku,
        available: item.quantity,
      });
    }
  }
  return Array.from(byProduct.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

export function GoodsIssueForm() {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();
  const [form] = Form.useForm();

  const [warehouseId, setWarehouseId] = useState('');
  const [department, setDepartment] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([
    { key: newLineKey(), productId: '', quantity: 1 },
  ]);
  const [assignBins, setAssignBins] = useState(false);
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [bins, setBins] = useState<LocationNode[]>([]);
  const [saving, setSaving] = useState(false);

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === 'active'),
    [warehouses]
  );

  const stockByProduct = useMemo(() => {
    const map = new Map<string, StockOption>();
    for (const s of stockOptions) map.set(s.productId, s);
    return map;
  }, [stockOptions]);

  const loadStock = useCallback(async (whId: string) => {
    if (!whId) {
      setStockOptions([]);
      return;
    }
    setStockLoading(true);
    try {
      const data = await fetchWarehouseInventory(whId, {
        page: 1,
        limit: 500,
        inStock: true,
      });
      setStockOptions(aggregateStock(data.items));
    } catch (e) {
      setStockOptions([]);
      message.error(e instanceof Error ? e.message : 'Failed to load warehouse stock');
    } finally {
      setStockLoading(false);
    }
  }, []);

  const loadBins = useCallback(async (whId: string) => {
    if (!whId) {
      setBins([]);
      return;
    }
    try {
      const data = await fetchWarehouseStructure(whId);
      setBins(binsFromStructure(data.structure));
    } catch {
      setBins([]);
    }
  }, []);

  useEffect(() => {
    void loadStock(warehouseId);
  }, [warehouseId, loadStock]);

  useEffect(() => {
    if (!assignBins) return;
    void loadBins(warehouseId);
  }, [assignBins, warehouseId, loadBins]);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { key: newLineKey(), productId: '', quantity: 1 }]);
  };

  const buildPayloadLines = (): GoodsIssueLineInput[] | null => {
    const valid = lines.filter((l) => l.productId && l.quantity > 0);
    if (!valid.length) {
      message.error('Add at least one line with a product and quantity > 0');
      return null;
    }
    for (const line of valid) {
      const stock = stockByProduct.get(line.productId);
      if (stock && line.quantity > stock.available) {
        message.warning(
          `${stock.label}: qty ${line.quantity} exceeds available ${stock.available}`
        );
      }
    }
    return valid.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      locationId: assignBins ? l.locationId || null : null,
    }));
  };

  const handleSave = async (andSubmit: boolean) => {
    if (!warehouseId) {
      message.error('Select a warehouse');
      return;
    }
    const payloadLines = buildPayloadLines();
    if (!payloadLines) return;

    setSaving(true);
    try {
      const created = await createGoodsIssue({
        warehouseId,
        department: department.trim(),
        requesterName: requesterName.trim(),
        notes: notes.trim(),
        lines: payloadLines,
        submit: andSubmit,
      });
      message.success(andSubmit ? 'Issue submitted for approval' : 'Draft saved');
      router.push(`/dashboard/goods-issues/${created.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to save issue');
    } finally {
      setSaving(false);
    }
  };

  const warehouseOptions = activeWarehouses.map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}`,
  }));

  const productSelectOptions = stockOptions.map((s) => ({
    value: s.productId,
    label: `${s.label}${s.sku ? ` (${s.sku})` : ''} · avail ${s.available}`,
  }));

  const binOptions = bins.map((b) => ({
    value: b.id,
    label: `${b.code} — ${b.name}`,
  }));

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_: unknown, row: DraftLine) => (
        <Select
          showSearch
          optionFilterProp="label"
          placeholder={warehouseId ? 'Select product' : 'Pick warehouse first'}
          disabled={!warehouseId}
          loading={stockLoading}
          style={{ width: '100%', minWidth: 220 }}
          value={row.productId || undefined}
          options={productSelectOptions}
          onChange={(productId) => updateLine(row.key, { productId })}
        />
      ),
    },
    {
      title: 'Qty',
      key: 'qty',
      width: 110,
      render: (_: unknown, row: DraftLine) => {
        const avail = stockByProduct.get(row.productId)?.available;
        return (
          <div>
            <InputNumber
              min={1}
              value={row.quantity}
              style={{ width: '100%' }}
              onChange={(v) =>
                updateLine(row.key, { quantity: typeof v === 'number' ? v : 1 })
              }
            />
            {avail != null && (
              <Text type="secondary" className="text-xs">
                avail {avail}
              </Text>
            )}
          </div>
        );
      },
    },
    ...(assignBins
      ? [
          {
            title: 'From bin',
            key: 'bin',
            width: 180,
            render: (_: unknown, row: DraftLine) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Optional"
                style={{ width: '100%' }}
                value={row.locationId}
                options={binOptions}
                onChange={(locationId) => updateLine(row.key, { locationId })}
              />
            ),
          },
        ]
      : []),
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, row: DraftLine) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={lines.length <= 1}
          onClick={() => removeLine(row.key)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="!px-0 mb-1"
            onClick={() => router.push('/dashboard/goods-issues')}
          >
            Back
          </Button>
          <Title level={3} className="!mb-1">
            New goods issue
          </Title>
          <Text type="secondary">
            Request stock out of a warehouse — pick after approval
          </Text>
        </div>
      </div>

      <Card>
        <Form form={form} layout="vertical">
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item label="Warehouse" required>
              <Select
                showSearch
                optionFilterProp="label"
                loading={warehousesLoading}
                placeholder="Source warehouse"
                value={warehouseId || undefined}
                options={warehouseOptions}
                onChange={(id) => {
                  setWarehouseId(id);
                  setLines((prev) =>
                    prev.map((l) => ({
                      ...l,
                      productId: '',
                      locationId: undefined,
                    }))
                  );
                }}
              />
            </Form.Item>
            <Form.Item label="Department">
              <Input
                value={department}
                placeholder="e.g. Kitchen, Front office"
                onChange={(e) => setDepartment(e.target.value)}
              />
            </Form.Item>
          </div>

          <Form.Item label="Requester name">
            <Input
              value={requesterName}
              placeholder="Who is requesting the stock"
              onChange={(e) => setRequesterName(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="Notes">
            <Input.TextArea
              rows={2}
              value={notes}
              placeholder="Optional notes"
              onChange={(e) => setNotes(e.target.value)}
            />
          </Form.Item>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Title level={5} className="!mb-0" style={{ color: BRAND }}>
              Lines
            </Title>
            <div className="flex items-center gap-2">
              <Text type="secondary">Assign bins</Text>
              <Switch checked={assignBins} onChange={setAssignBins} size="small" />
            </div>
          </div>

          <Table
            size="small"
            pagination={false}
            rowKey="key"
            dataSource={lines}
            columns={columns}
            scroll={{ x: true }}
          />

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            className="mt-3"
            onClick={addLine}
            block
          >
            Add line
          </Button>
        </Form>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button onClick={() => router.push('/dashboard/goods-issues')}>
            Cancel
          </Button>
          <Button
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => void handleSave(false)}
          >
            Save draft
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={saving}
            onClick={() => void handleSave(true)}
          >
            Save & submit
          </Button>
        </div>
      </Card>
    </div>
  );
}
