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
import { useProducts } from '../../context/ProductsContext';
import { useSuppliers } from '../../context/SuppliersContext';
import {
  fetchWarehouseStructure,
  storableLocationsFromStructure,
  type LocationNode,
} from '../../lib/warehousesApi';
import {
  createGoodsReceipt,
  updateGoodsReceipt,
  submitGoodsReceipt,
  type GoodsReceipt,
  type GoodsReceiptLineInput,
} from '../../lib/goodsReceiptsApi';
import { BRAND } from '../../lib/brand';

const { Title, Text } = Typography;

export type DraftLine = {
  key: string;
  productId: string;
  quantity: number;
  locationId?: string;
};

type Props = {
  mode: 'create' | 'edit';
  initial?: GoodsReceipt | null;
  onCancel?: () => void;
  onSaved?: (receipt: GoodsReceipt) => void;
};

function newLineKey(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function receiptToDraftLines(r: GoodsReceipt): DraftLine[] {
  if (!r.lines.length) {
    return [{ key: newLineKey(), productId: '', quantity: 1 }];
  }
  return r.lines.map((line) => ({
    key: line.id || newLineKey(),
    productId: line.product.id,
    quantity: line.quantity,
    locationId: line.location?.id || undefined,
  }));
}

export function GoodsReceiptForm({ mode, initial, onCancel, onSaved }: Props) {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();
  const { visibleProducts, productsLoading } = useProducts();
  const { suppliers, suppliersLoading } = useSuppliers();
  const [form] = Form.useForm();

  const [warehouseId, setWarehouseId] = useState(initial?.warehouse.id ?? '');
  const [supplierId, setSupplierId] = useState(initial?.supplier?.id ?? '');
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? '');
  const [reference, setReference] = useState(initial?.reference ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [lines, setLines] = useState<DraftLine[]>(() =>
    initial ? receiptToDraftLines(initial) : [{ key: newLineKey(), productId: '', quantity: 1 }]
  );
  const [assignBins, setAssignBins] = useState(() =>
    Boolean(initial?.lines.some((l) => l.location))
  );
  const [bins, setBins] = useState<LocationNode[]>([]);
  const [saving, setSaving] = useState(false);

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === 'active'),
    [warehouses]
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === 'active'),
    [suppliers]
  );

  const hasSuppliers = activeSuppliers.length > 0;

  const loadBins = useCallback(async (whId: string) => {
    if (!whId) {
      setBins([]);
      return;
    }
    try {
      const data = await fetchWarehouseStructure(whId);
      setBins(storableLocationsFromStructure(data.structure));
    } catch {
      setBins([]);
    }
  }, []);

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

  const buildPayloadLines = (): GoodsReceiptLineInput[] | null => {
    const valid = lines.filter((l) => l.productId && l.quantity > 0);
    if (!valid.length) {
      message.error('Add at least one line with a product and quantity > 0');
      return null;
    }
    return valid.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      locationId: assignBins ? l.locationId || null : null,
    }));
  };

  const handleBack = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(
      initial
        ? `/dashboard/goods-receipts/${initial.id}`
        : '/dashboard/goods-receipts'
    );
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
      const supplierPayload = hasSuppliers
        ? {
            supplierId: supplierId || null,
            supplierName: undefined as string | undefined,
          }
        : {
            supplierId: null as string | null,
            supplierName: supplierName.trim(),
          };

      if (mode === 'create') {
        const created = await createGoodsReceipt({
          warehouseId,
          ...supplierPayload,
          notes: notes.trim(),
          reference: reference.trim(),
          lines: payloadLines,
          submit: andSubmit,
        });
        message.success(andSubmit ? 'Receipt submitted for approval' : 'Draft saved');
        if (onSaved) onSaved(created);
        else router.push(`/dashboard/goods-receipts/${created.id}`);
        return;
      }

      if (!initial) return;
      let result = await updateGoodsReceipt(initial.id, {
        warehouseId,
        ...supplierPayload,
        notes: notes.trim(),
        reference: reference.trim(),
        lines: payloadLines,
      });
      if (andSubmit) {
        result = await submitGoodsReceipt(initial.id);
        message.success('Receipt submitted for approval');
      } else {
        message.success('Draft updated');
      }
      if (onSaved) onSaved(result);
      else router.push(`/dashboard/goods-receipts/${initial.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  const warehouseOptions = activeWarehouses.map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}`,
  }));

  const productSelectOptions = visibleProducts.map((p) => ({
    value: p.id,
    label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
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
          placeholder="Select product"
          loading={productsLoading}
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
      render: (_: unknown, row: DraftLine) => (
        <InputNumber
          min={1}
          value={row.quantity}
          style={{ width: '100%' }}
          onChange={(v) => updateLine(row.key, { quantity: typeof v === 'number' ? v : 1 })}
        />
      ),
    },
    ...(assignBins
      ? [
          {
            title: 'Location bin',
            key: 'bin',
            width: 200,
            render: (_: unknown, row: DraftLine) => (
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Optional"
                disabled={!warehouseId}
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
            onClick={handleBack}
          >
            Back
          </Button>
          <Title level={3} className="!mb-1">
            {mode === 'create'
              ? 'New goods receipt'
              : `Edit ${initial?.receiptNumber ?? 'draft'}`}
          </Title>
          <Text type="secondary">
            Receive stock into a warehouse — stock posts when approved
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
                placeholder="Select warehouse"
                value={warehouseId || undefined}
                options={warehouseOptions}
                onChange={(id) => {
                  setWarehouseId(id);
                  setLines((prev) =>
                    prev.map((l) => ({ ...l, locationId: undefined }))
                  );
                }}
              />
            </Form.Item>
            <Form.Item label="Supplier">
              {hasSuppliers ? (
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  loading={suppliersLoading}
                  placeholder="Select supplier"
                  value={supplierId || undefined}
                  options={activeSuppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  onChange={(v) => setSupplierId(v ?? '')}
                />
              ) : (
                <Input
                  value={supplierName}
                  placeholder="Supplier name"
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              )}
            </Form.Item>
          </div>

          <Form.Item label="Reference">
            <Input
              value={reference}
              placeholder="PO #, invoice #, etc."
              onChange={(e) => setReference(e.target.value)}
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
          <Button onClick={handleBack}>Cancel</Button>
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
