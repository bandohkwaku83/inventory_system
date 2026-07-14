'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
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
  createTransfer,
  updateTransfer,
  submitTransfer,
  type TransferLineInput,
  type WarehouseTransfer,
} from '../../lib/transfersApi';
import { BRAND } from '../../lib/brand';

const { Title, Text } = Typography;

export type DraftLine = {
  key: string;
  productId: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
};

type StockOption = {
  productId: string;
  label: string;
  sku: string;
  available: number;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: WarehouseTransfer | null;
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

function transferToDraftLines(t: WarehouseTransfer): DraftLine[] {
  if (!t.lines.length) {
    return [{ key: newLineKey(), productId: '', quantity: 1 }];
  }
  return t.lines.map((line) => ({
    key: line.id || newLineKey(),
    productId: line.product.id,
    quantity: line.quantity,
    fromLocationId: line.fromLocation?.id || undefined,
    toLocationId: line.toLocation?.id || undefined,
  }));
}

export function TransferForm({ mode, initial }: Props) {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();
  const [form] = Form.useForm();

  const [fromWarehouseId, setFromWarehouseId] = useState(initial?.fromWarehouse.id ?? '');
  const [toWarehouseId, setToWarehouseId] = useState(initial?.toWarehouse.id ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [lines, setLines] = useState<DraftLine[]>(() =>
    initial ? transferToDraftLines(initial) : [{ key: newLineKey(), productId: '', quantity: 1 }]
  );
  const [assignBins, setAssignBins] = useState(() =>
    Boolean(
      initial?.lines.some((l) => l.fromLocation || l.toLocation)
    )
  );
  const [stockOptions, setStockOptions] = useState<StockOption[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [fromBins, setFromBins] = useState<LocationNode[]>([]);
  const [toBins, setToBins] = useState<LocationNode[]>([]);
  const [saving, setSaving] = useState(false);

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === 'active'),
    [warehouses]
  );

  const sameWarehouse = Boolean(fromWarehouseId && fromWarehouseId === toWarehouseId);

  const stockByProduct = useMemo(() => {
    const map = new Map<string, StockOption>();
    for (const s of stockOptions) map.set(s.productId, s);
    return map;
  }, [stockOptions]);

  const loadStock = useCallback(async (warehouseId: string) => {
    if (!warehouseId) {
      setStockOptions([]);
      return;
    }
    setStockLoading(true);
    try {
      const data = await fetchWarehouseInventory(warehouseId, {
        page: 1,
        limit: 500,
        inStock: true,
      });
      setStockOptions(aggregateStock(data.items));
    } catch (e) {
      setStockOptions([]);
      message.error(e instanceof Error ? e.message : 'Failed to load source inventory');
    } finally {
      setStockLoading(false);
    }
  }, []);

  const loadBins = useCallback(async (warehouseId: string, side: 'from' | 'to') => {
    if (!warehouseId) {
      if (side === 'from') setFromBins([]);
      else setToBins([]);
      return;
    }
    try {
      const data = await fetchWarehouseStructure(warehouseId);
      const bins = binsFromStructure(data.structure);
      if (side === 'from') setFromBins(bins);
      else setToBins(bins);
    } catch {
      if (side === 'from') setFromBins([]);
      else setToBins([]);
    }
  }, []);

  useEffect(() => {
    void loadStock(fromWarehouseId);
  }, [fromWarehouseId, loadStock]);

  useEffect(() => {
    if (!assignBins) return;
    void loadBins(fromWarehouseId, 'from');
    void loadBins(toWarehouseId, 'to');
  }, [assignBins, fromWarehouseId, toWarehouseId, loadBins]);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { key: newLineKey(), productId: '', quantity: 1 }]);
  };

  const buildPayloadLines = (): TransferLineInput[] | null => {
    const valid = lines.filter((l) => l.productId && l.quantity > 0);
    if (!valid.length) {
      message.error('Add at least one line with a product and quantity > 0');
      return null;
    }
    for (const line of valid) {
      const stock = stockByProduct.get(line.productId);
      if (stock && line.quantity > stock.available) {
        message.warning(
          `${stock.label}: qty ${line.quantity} exceeds available ${stock.available} (server will hard-check on approve)`
        );
      }
    }
    return valid.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      fromLocationId: assignBins ? l.fromLocationId || null : null,
      toLocationId: assignBins ? l.toLocationId || null : null,
    }));
  };

  const handleSave = async (andSubmit: boolean) => {
    if (!fromWarehouseId || !toWarehouseId) {
      message.error('Select both from and to warehouses');
      return;
    }
    const payloadLines = buildPayloadLines();
    if (!payloadLines) return;

    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await createTransfer({
          fromWarehouseId,
          toWarehouseId,
          notes: notes.trim(),
          lines: payloadLines,
          submit: andSubmit,
        });
        message.success(andSubmit ? 'Transfer submitted for approval' : 'Draft saved');
        router.push(`/dashboard/warehouse-transfers/${created.id}`);
        return;
      }

      if (!initial) return;
      await updateTransfer(initial.id, {
        fromWarehouseId,
        toWarehouseId,
        notes: notes.trim(),
        lines: payloadLines,
      });
      if (andSubmit) {
        await submitTransfer(initial.id);
        message.success('Transfer submitted for approval');
      } else {
        message.success('Draft updated');
      }
      router.push(`/dashboard/warehouse-transfers/${initial.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to save transfer');
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

  const binOptions = (bins: LocationNode[]) =>
    bins.map((b) => ({
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
          placeholder={fromWarehouseId ? 'Select product' : 'Pick source warehouse first'}
          disabled={!fromWarehouseId}
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
              onChange={(v) => updateLine(row.key, { quantity: typeof v === 'number' ? v : 1 })}
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
            key: 'fromBin',
            width: 180,
            render: (_: unknown, row: DraftLine) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Optional"
                style={{ width: '100%' }}
                value={row.fromLocationId}
                options={binOptions(fromBins)}
                onChange={(fromLocationId) => updateLine(row.key, { fromLocationId })}
              />
            ),
          },
          {
            title: 'To bin',
            key: 'toBin',
            width: 180,
            render: (_: unknown, row: DraftLine) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Optional"
                style={{ width: '100%' }}
                value={row.toLocationId}
                options={binOptions(toBins)}
                onChange={(toLocationId) => updateLine(row.key, { toLocationId })}
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
            onClick={() =>
              router.push(
                initial
                  ? `/dashboard/warehouse-transfers/${initial.id}`
                  : '/dashboard/warehouse-transfers'
              )
            }
          >
            Back
          </Button>
          <Title level={3} className="!mb-1">
            {mode === 'create' ? 'New transfer' : `Edit ${initial?.transferNumber ?? 'draft'}`}
          </Title>
          <Text type="secondary">
            Draft only — stock moves when the transfer is approved, then received
          </Text>
        </div>
      </div>

      <Card>
        <Form form={form} layout="vertical">
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item label="From warehouse" required>
              <Select
                showSearch
                optionFilterProp="label"
                loading={warehousesLoading}
                placeholder="Source warehouse"
                value={fromWarehouseId || undefined}
                options={warehouseOptions}
                onChange={(id) => {
                  setFromWarehouseId(id);
                  setLines((prev) =>
                    prev.map((l) => ({
                      ...l,
                      productId: '',
                      fromLocationId: undefined,
                    }))
                  );
                }}
              />
            </Form.Item>
            <Form.Item label="To warehouse" required>
              <Select
                showSearch
                optionFilterProp="label"
                loading={warehousesLoading}
                placeholder="Destination warehouse"
                value={toWarehouseId || undefined}
                options={warehouseOptions}
                onChange={(id) => {
                  setToWarehouseId(id);
                  setLines((prev) =>
                    prev.map((l) => ({ ...l, toLocationId: undefined }))
                  );
                }}
              />
            </Form.Item>
          </div>

          {sameWarehouse && (
            <Alert
              type="info"
              showIcon
              className="mb-4"
              message="Internal bin move"
              description="Same warehouse selected — use this for bin-to-bin moves within one warehouse."
            />
          )}

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
            <Space>
              <Text type="secondary">Assign bins</Text>
              <Switch checked={assignBins} onChange={setAssignBins} size="small" />
            </Space>
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
          <Button
            onClick={() =>
              router.push(
                initial
                  ? `/dashboard/warehouse-transfers/${initial.id}`
                  : '/dashboard/warehouse-transfers'
              )
            }
          >
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
