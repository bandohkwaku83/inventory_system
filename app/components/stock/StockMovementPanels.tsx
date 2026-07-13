'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Modal,
  Form,
  Row,
  Col,
  Statistic,
  Space,
  DatePicker,
  Alert,
  Descriptions,
  Divider,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined, PlusOutlined, DownloadOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  WAREHOUSES,
  STOCK_AVAILABILITY,
  STOCK_LEDGER,
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
  STOCK_IN_SOURCES,
  STOCK_OUT_REASONS,
  warehouseName,
  formatStockCurrency,
  nextMovementReference,
  type StockMovement,
  type StockMovementType,
  type StockAvailability,
  type StockLedgerEntry,
  type StockInSource,
  type StockOutReason,
  type ReturnCondition,
} from '../../lib/stockManagementData';
import { BRAND } from '../../lib/brand';

const { Title, Text, Paragraph } = Typography;

const warehouseOptions = WAREHOUSES.filter((w) => w.status === 'active').map((w) => ({
  value: w.id,
  label: `${w.code} — ${w.name}`,
}));

function ResultPreview({ previous, next }: { previous?: number; next?: number }) {
  if (previous == null || next == null) return null;
  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
      <Text className="text-xs font-semibold uppercase text-emerald-800">Result</Text>
      <div className="mt-1 flex gap-6 text-sm">
        <span>Previous Stock: <strong>{previous}</strong></span>
        <span>→</span>
        <span>New Stock: <strong className="text-emerald-700">{next}</strong></span>
      </div>
    </div>
  );
}

type PanelProps = {
  movements: StockMovement[];
  onAdd: (m: StockMovement) => void;
};

function MovementTable({
  data,
  extraColumns = [],
}: {
  data: StockMovement[];
  extraColumns?: TableProps<StockMovement>['columns'];
}) {
  const base: TableProps<StockMovement>['columns'] = [
    { title: 'Reference', dataIndex: 'reference', render: (v) => <span className="font-mono text-xs font-semibold">{v}</span> },
    {
      title: 'Product',
      key: 'product',
      render: (_, r) => (
        <div>
          <p className="text-sm font-medium">{r.productName}</p>
          <p className="text-xs text-slate-500">{r.sku}</p>
        </div>
      ),
    },
    { title: 'Warehouse', dataIndex: 'warehouseId', render: (id) => <span className="text-xs">{warehouseName(id)}</span> },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      align: 'right',
      render: (v: number, r) => (
        <span className={v < 0 ? 'font-semibold text-red-600' : 'font-semibold text-slate-800'}>
          {v > 0 ? '+' : ''}{v} {r.unit}
        </span>
      ),
    },
    {
      title: 'Balance',
      key: 'bal',
      align: 'right',
      render: (_, r) =>
        r.previousQty != null && r.newQty != null ? (
          <span className="text-xs text-slate-500">{r.previousQty} → <strong>{r.newQty}</strong></span>
        ) : '—',
    },
    { title: 'By', dataIndex: 'createdBy' },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      render: (v) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    },
  ];
  return (
    <Table<StockMovement>
      columns={[...base.slice(0, 3), ...(extraColumns ?? []), ...base.slice(3)]}
      dataSource={data}
      rowKey="id"
      pagination={{ pageSize: 10, showTotal: (t) => `${t} records` }}
      scroll={{ x: 900 }}
    />
  );
}

export function StockOverviewPanel({ movements }: { movements: StockMovement[] }) {
  const lowStock = STOCK_AVAILABILITY.filter((s) => s.available < s.minimumLevel);
  const [selectedSku, setSelectedSku] = useState<string | null>(STOCK_AVAILABILITY[0]?.sku ?? null);
  const selected = STOCK_AVAILABILITY.find((s) => s.sku === selectedSku && s.warehouseId === 'wh-001')
    ?? STOCK_AVAILABILITY.find((s) => s.sku === selectedSku);

  const productOptions = Array.from(
    new Map(STOCK_AVAILABILITY.map((s) => [s.sku, { value: s.sku, label: s.productName }])).values()
  );

  return (
    <div className="space-y-6">
      {lowStock.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`${lowStock.length} product(s) below minimum stock level`}
          description={
            <ul className="mt-1 list-inside list-disc text-sm">
              {lowStock.map((s) => (
                <li key={`${s.sku}-${s.warehouseId}`}>
                  <strong>{s.productName}</strong> at {warehouseName(s.warehouseId)}: {s.available} / min {s.minimumLevel}
                </li>
              ))}
            </ul>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        {(['stock_in', 'stock_out', 'adjustment', 'opening', 'damaged', 'returned'] as StockMovementType[]).map((t) => (
          <Col xs={12} sm={8} md={4} key={t}>
            <Card size="small" className="!rounded-xl">
              <Statistic
                title={MOVEMENT_TYPE_LABELS[t]}
                value={movements.filter((m) => m.type === t).length}
                valueStyle={{ fontSize: '1.2rem', color: t === 'damaged' ? '#dc2626' : undefined }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Text className="text-xs font-semibold uppercase text-slate-500">Stock availability</Text>
          <Select
            value={selectedSku ?? undefined}
            onChange={setSelectedSku}
            options={productOptions}
            className="min-w-[200px]"
            placeholder="Select product"
          />
        </div>

        {selected && (
          <Card className="!rounded-xl border-slate-200" style={{ background: `linear-gradient(180deg, ${BRAND}06 0%, white 100%)` }}>
            <Title level={5} className="!mb-4">{selected.productName}</Title>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={4}>
                <Statistic title="Available" value={selected.available} valueStyle={{ color: '#059669' }} />
                <Text type="secondary" className="text-[10px]">Sellable / issuable</Text>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic title="Reserved" value={selected.reserved} valueStyle={{ color: '#2563eb' }} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic title="Damaged" value={selected.damaged} valueStyle={{ color: '#dc2626' }} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic title="On Order" value={selected.onOrder} valueStyle={{ color: '#7c3aed' }} />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="Total"
                  value={selected.available + selected.reserved + selected.damaged}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="Minimum"
                  value={selected.minimumLevel}
                  valueStyle={{ color: selected.available < selected.minimumLevel ? '#d97706' : undefined }}
                />
              </Col>
            </Row>
            <Paragraph type="secondary" className="!mb-0 !mt-3 text-xs">
              Warehouse: {warehouseName(selected.warehouseId)} · Only <strong>Available</strong> quantity can be sold or issued.
            </Paragraph>
          </Card>
        )}

        <Table<StockAvailability>
          className="mt-4"
          size="small"
          rowKey={(r) => `${r.sku}-${r.warehouseId}`}
          dataSource={STOCK_AVAILABILITY}
          columns={[
            { title: 'Product', dataIndex: 'productName' },
            { title: 'SKU', dataIndex: 'sku', render: (v) => <span className="font-mono text-xs">{v}</span> },
            { title: 'Warehouse', dataIndex: 'warehouseId', render: (id) => warehouseName(id) },
            { title: 'Available', dataIndex: 'available', align: 'right', render: (v) => <strong className="text-emerald-700">{v}</strong> },
            { title: 'Reserved', dataIndex: 'reserved', align: 'right' },
            { title: 'Damaged', dataIndex: 'damaged', align: 'right' },
            { title: 'On Order', dataIndex: 'onOrder', align: 'right' },
            {
              title: 'Min',
              dataIndex: 'minimumLevel',
              align: 'right',
              render: (min, r) => (
                <span className={r.available < min ? 'font-bold text-amber-600' : ''}>{min}</span>
              ),
            },
            {
              title: 'Status',
              key: 'status',
              render: (_, r) =>
                r.available < r.minimumLevel ? (
                  <Tag color="warning">Low stock</Tag>
                ) : r.available === 0 ? (
                  <Tag color="error">Out of stock</Tag>
                ) : (
                  <Tag color="success">OK</Tag>
                ),
            },
          ]}
          pagination={false}
        />
      </div>
    </div>
  );
}

export function StockInPanel({ movements, onAdd }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [preview, setPreview] = useState<{ prev: number; next: number } | null>(null);
  const data = movements.filter((m) => m.type === 'stock_in');

  const submit = () => {
    form.validateFields().then((v) => {
      const qty = Number(v.quantity);
      const prev = Number(v.previousStock ?? 0);
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        reference: nextMovementReference('stock_in', movements.length),
        type: 'stock_in',
        warehouseId: v.warehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: qty,
        previousQty: prev,
        newQty: prev + qty,
        unit: v.unit || 'pcs',
        stockInSource: v.source,
        supplier: v.supplier,
        unitCost: v.unitCost,
        transactionLabel: 'Stock In',
        reason: `${STOCK_IN_SOURCES[v.source as StockInSource]}${v.supplier ? ` — ${v.supplier}` : ''}`,
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        status: 'completed',
        qtyIn: qty,
      };
      onAdd(movement);
      setOpen(false);
      form.resetFields();
      setPreview(null);
      message.success(`Stock in recorded. New balance: ${prev + qty}`);
    });
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Inventory enters the warehouse. Sources: Purchase, Donation, Returned goods, Initial stock.
      </Paragraph>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setPreview(null); setOpen(true); }}>
          Record Stock In
        </Button>
      </div>
      <MovementTable
        data={data}
        extraColumns={[
          { title: 'Source', dataIndex: 'stockInSource', render: (s: StockInSource) => STOCK_IN_SOURCES[s] ?? '—' },
          { title: 'Supplier', dataIndex: 'supplier' },
          { title: 'Unit Cost', dataIndex: 'unitCost', align: 'right', render: (v) => (v ? formatStockCurrency(v) : '—') },
        ]}
      />
      <Modal title="Stock In" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Record stock in" width={560}>
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          onValuesChange={(_, all) => {
            const prev = Number(all.previousStock ?? 0);
            const qty = Number(all.quantity ?? 0);
            if (prev >= 0 && qty > 0) setPreview({ prev, next: prev + qty });
          }}
        >
          <Form.Item name="source" label="Source" rules={[{ required: true }]}>
            <Select options={Object.entries(STOCK_IN_SOURCES).map(([v, l]) => ({ value: v, label: l }))} />
          </Form.Item>
          <Form.Item name="supplier" label="Supplier">
            <Input placeholder="ABC Computers" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="productName" label="Product" rules={[{ required: true }]}>
                <Input placeholder="HP Laptop" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unitCost" label="Unit Cost (GH₵)">
                <Input type="number" min={0} placeholder="5000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="previousStock" label="Previous Stock" rules={[{ required: true }]}>
                <Input type="number" min={0} placeholder="50" />
              </Form.Item>
            </Col>
          </Row>
          {preview && <ResultPreview previous={preview.prev} next={preview.next} />}
        </Form>
      </Modal>
    </>
  );
}

export function StockOutPanel({ movements, onAdd }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [preview, setPreview] = useState<{ prev: number; next: number } | null>(null);
  const data = movements.filter((m) => m.type === 'stock_out');

  const submit = () => {
    form.validateFields().then((v) => {
      const qty = Number(v.quantity);
      const prev = Number(v.previousStock);
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        reference: nextMovementReference('stock_out', movements.length),
        type: 'stock_out',
        warehouseId: v.warehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: qty,
        previousQty: prev,
        newQty: prev - qty,
        unit: 'pcs',
        stockOutReason: v.reason,
        transactionLabel: STOCK_OUT_REASONS[v.reason as StockOutReason],
        reason: v.reasonNotes || STOCK_OUT_REASONS[v.reason as StockOutReason],
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        status: 'completed',
        qtyOut: qty,
      };
      onAdd(movement);
      setOpen(false);
      form.resetFields();
      message.success(`Stock out recorded. Remaining: ${prev - qty}`);
    });
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Inventory leaves the warehouse. Reasons: Sale, Damage, Internal use, Transfer, Expired products.
      </Paragraph>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Record Stock Out</Button>
      </div>
      <MovementTable
        data={data}
        extraColumns={[
          { title: 'Reason', dataIndex: 'stockOutReason', render: (r: StockOutReason) => STOCK_OUT_REASONS[r] ?? '—' },
          { title: 'Notes', dataIndex: 'reason', ellipsis: true },
        ]}
      />
      <Modal title="Stock Out" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Record stock out" width={520}>
        <Form form={form} layout="vertical" className="mt-4" onValuesChange={(_, all) => {
          const prev = Number(all.previousStock ?? 0);
          const qty = Number(all.quantity ?? 0);
          if (prev > 0 && qty > 0) setPreview({ prev, next: prev - qty });
        }}>
          <Row gutter={12}>
            <Col span={16}><Form.Item name="productName" label="Product" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col>
            <Col span={8}><Form.Item name="previousStock" label="Previous Stock" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
                <Select options={Object.entries(STOCK_OUT_REASONS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reasonNotes" label="Reason details">
            <Input placeholder="Customer Sale" />
          </Form.Item>
          {preview && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/60 px-4 py-3">
              <Text className="text-xs font-semibold uppercase text-orange-800">Result</Text>
              <div className="mt-1 flex gap-6 text-sm">
                <span>Previous: <strong>{preview.prev}</strong></span>
                <span>Remaining: <strong className="text-orange-700">{preview.next}</strong></span>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </>
  );
}

export function StockAdjustmentPanel({ movements, onAdd }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const data = movements.filter((m) => m.type === 'adjustment');

  const submit = () => {
    form.validateFields().then((v) => {
      const system = Number(v.systemStock);
      const physical = Number(v.physicalCount);
      const adj = physical - system;
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        reference: nextMovementReference('adjustment', movements.length),
        type: 'adjustment',
        warehouseId: v.warehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: adj,
        previousQty: system,
        newQty: physical,
        systemStock: system,
        physicalCount: physical,
        unit: 'pcs',
        transactionLabel: 'Adjustment',
        reason: v.reason,
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        status: 'completed',
        qtyIn: adj > 0 ? adj : undefined,
        qtyOut: adj < 0 ? Math.abs(adj) : undefined,
      };
      onAdd(movement);
      setOpen(false);
      form.resetFields();
      message.success(`Adjustment of ${adj > 0 ? '+' : ''}${adj} recorded`);
    });
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Correct stock when physical count differs from system. Every adjustment requires a reason and is logged.
      </Paragraph>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Record Adjustment</Button>
      </div>
      <MovementTable
        data={data}
        extraColumns={[
          { title: 'System', dataIndex: 'systemStock', align: 'right' },
          { title: 'Physical', dataIndex: 'physicalCount', align: 'right' },
          { title: 'Reason', dataIndex: 'reason', ellipsis: true },
        ]}
      />
      <Modal title="Stock Adjustment" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Save adjustment" width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={12}>
            <Col span={16}><Form.Item name="productName" label="Product" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={8}><Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="systemStock" label="System Stock" rules={[{ required: true }]}>
                <Input type="number" placeholder="100" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="physicalCount" label="Physical Count" rules={[{ required: true }]}>
                <Input type="number" placeholder="97" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) => {
              const sys = Number(getFieldValue('systemStock'));
              const phys = Number(getFieldValue('physicalCount'));
              if (!sys && !phys) return null;
              const adj = phys - sys;
              if (Number.isNaN(adj)) return null;
              return (
                <Alert
                  type={adj < 0 ? 'warning' : 'info'}
                  className="!mb-4"
                  message={`Adjustment: ${adj > 0 ? '+' : ''}${adj}`}
                  description={adj < 0 ? 'Stock will decrease' : 'Stock will increase'}
                />
              );
            }}
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true, message: 'Reason is required for every adjustment' }]}>
            <Input.TextArea rows={2} placeholder="Damaged during storage" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function OpeningStockPanel({ movements, onAdd }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const data = movements.filter((m) => m.type === 'opening');

  const submit = () => {
    form.validateFields().then((v) => {
      const qty = Number(v.quantity);
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        reference: nextMovementReference('opening', movements.length),
        type: 'opening',
        warehouseId: v.warehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: qty,
        newQty: qty,
        unit: 'pcs',
        unitCost: v.unitCost,
        openingDate: v.openingDate?.format?.('YYYY-MM-DD') ?? v.openingDate,
        transactionLabel: 'Opening Stock',
        reason: 'Opening balance',
        createdBy: 'You',
        createdAt: v.openingDate?.toISOString?.() ?? new Date().toISOString(),
        status: 'completed',
        qtyIn: qty,
      };
      onAdd(movement);
      setOpen(false);
      form.resetFields();
      message.success('Opening stock recorded');
    });
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Record initial inventory when first using the system.
      </Paragraph>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Record Opening Stock</Button>
      </div>
      <MovementTable
        data={data}
        extraColumns={[
          { title: 'Unit Cost', dataIndex: 'unitCost', align: 'right', render: (v) => (v ? formatStockCurrency(v) : '—') },
          { title: 'Date', dataIndex: 'openingDate' },
        ]}
      />
      <Modal title="Opening Stock" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Save" width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={12}>
            <Col span={16}><Form.Item name="productName" label="Product" rules={[{ required: true }]}><Input placeholder="Dell Laptop" /></Form.Item></Col>
            <Col span={8}><Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="quantity" label="Opening Quantity" rules={[{ required: true }]}><Input type="number" min={0} /></Form.Item></Col>
            <Col span={8}><Form.Item name="unitCost" label="Unit Cost (GH₵)" rules={[{ required: true }]}><Input type="number" min={0} placeholder="4500" /></Form.Item></Col>
            <Col span={8}>
              <Form.Item name="openingDate" label="Date" rules={[{ required: true }]} initialValue={dayjs('2026-01-01')}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
}

export function DamagedStockPanel({ movements, onAdd }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const data = movements.filter((m) => m.type === 'damaged');

  const submit = () => {
    form.validateFields().then((v) => {
      const qty = Number(v.damagedQty);
      const avail = Number(v.available);
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        reference: nextMovementReference('damaged', movements.length),
        type: 'damaged',
        warehouseId: v.warehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: qty,
        previousQty: avail,
        newQty: avail - qty,
        unit: 'pcs',
        transactionLabel: 'Damaged Stock',
        reason: v.reason,
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        status: 'completed',
        qtyOut: qty,
      };
      onAdd(movement);
      setOpen(false);
      form.resetFields();
      message.success('Moved to damaged stock — not available for sale');
    });
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Separate damaged items from usable stock. Damaged stock is recorded for reporting but cannot be sold.
      </Paragraph>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Record Damaged Stock</Button>
      </div>
      <MovementTable data={data} extraColumns={[{ title: 'Reason', dataIndex: 'reason', ellipsis: true }]} />
      <Modal title="Damaged Stock" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Record" width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={12}>
            <Col span={16}><Form.Item name="productName" label="Product" rules={[{ required: true }]}><Input placeholder="Monitor" /></Form.Item></Col>
            <Col span={8}><Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="available" label="Available (before)" rules={[{ required: true }]}><Input type="number" placeholder="100" /></Form.Item></Col>
            <Col span={8}><Form.Item name="damagedQty" label="Damaged Qty" rules={[{ required: true }]}><Input type="number" min={1} placeholder="4" /></Form.Item></Col>
          </Row>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Water damage in storage" />
          </Form.Item>
          <Alert type="info" message="Damaged items are removed from available stock but remain on record." />
        </Form>
      </Modal>
    </>
  );
}

export function ReturnedStockPanel({ movements, onAdd }: PanelProps) {
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const data = movements.filter((m) => m.type === 'returned');

  const submit = () => {
    form.validateFields().then((v) => {
      const qty = Number(v.quantity);
      const condition = v.condition as ReturnCondition;
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        reference: nextMovementReference('returned', movements.length),
        type: 'returned',
        warehouseId: v.warehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: condition === 'good' ? qty : 0,
        unit: 'pcs',
        customer: v.customer,
        returnCondition: condition,
        transactionLabel: condition === 'good' ? 'Returned Stock' : 'Returned → Damaged',
        reason: v.reason,
        createdBy: 'You',
        createdAt: new Date().toISOString(),
        status: 'completed',
        qtyIn: condition === 'good' ? qty : undefined,
      };
      onAdd(movement);
      setOpen(false);
      form.resetFields();
      message.success(condition === 'good' ? 'Returned to available stock' : 'Moved to damaged stock');
    });
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Products returned by customers. Good condition → available stock. Otherwise → damaged stock.
      </Paragraph>
      <div className="mb-4 flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Record Return</Button>
      </div>
      <MovementTable
        data={data}
        extraColumns={[
          { title: 'Customer', dataIndex: 'customer' },
          {
            title: 'Condition',
            dataIndex: 'returnCondition',
            render: (c: ReturnCondition) => (
              <Tag color={c === 'good' ? 'success' : 'error'}>{c === 'good' ? 'Good → Available' : 'Damaged'}</Tag>
            ),
          },
          { title: 'Reason', dataIndex: 'reason', ellipsis: true },
        ]}
      />
      <Modal title="Returned Stock" open={open} onCancel={() => setOpen(false)} onOk={submit} okText="Record return" width={520}>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="customer" label="Customer" rules={[{ required: true }]}>
            <Input placeholder="James" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}><Form.Item name="productName" label="Product" rules={[{ required: true }]}><Input placeholder="Printer" /></Form.Item></Col>
            <Col span={8}><Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}><Form.Item name="quantity" label="Returned Qty" rules={[{ required: true }]}><Input type="number" min={1} /></Form.Item></Col>
            <Col span={16}>
              <Form.Item name="condition" label="Condition" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'good', label: 'Good condition → return to available stock' },
                  { value: 'damaged', label: 'Damaged → move to damaged stock' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input placeholder="Wrong item" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function StockMovementHistoryPanel({ movements }: { movements: StockMovement[] }) {
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string | 'all'>('all');

  const filtered = useMemo(() => {
    let list = [...movements];
    if (warehouseFilter !== 'all') list = list.filter((m) => m.warehouseId === warehouseFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.productName.toLowerCase().includes(q) || m.sku.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [movements, warehouseFilter, search]);

  const exportCsv = () => {
    const header = 'Date,Product,Type,Quantity,Warehouse,User,Reference\n';
    const rows = filtered.map((m) => {
      const label = m.transactionLabel ?? MOVEMENT_TYPE_LABELS[m.type];
      const qty = m.qtyIn ? `+${m.qtyIn}` : m.qtyOut ? `-${m.qtyOut}` : `${m.quantity > 0 ? '+' : ''}${m.quantity}`;
      return `${new Date(m.createdAt).toLocaleDateString('en-GB')},"${m.productName}",${label},${qty},${warehouseName(m.warehouseId)},${m.createdBy},${m.reference}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock-movement-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Paragraph type="secondary" className="!mb-4">
        Complete audit trail of every inventory movement.
      </Paragraph>
      <div className="table-toolbar mb-4 flex flex-wrap items-center justify-between gap-3">
        <Space wrap>
          <Input placeholder="Search product…" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" allowClear />
          <Select
            value={warehouseFilter}
            onChange={setWarehouseFilter}
            className="min-w-[180px]"
            options={[{ value: 'all', label: 'All warehouses' }, ...warehouseOptions]}
          />
        </Space>
        <Button icon={<DownloadOutlined />} onClick={exportCsv}>Export CSV</Button>
      </div>
      <Table<StockMovement>
        rowKey="id"
        dataSource={filtered}
        scroll={{ x: 800 }}
        pagination={{ pageSize: 15, showTotal: (t) => `${t} transactions` }}
        columns={[
          {
            title: 'Date',
            dataIndex: 'createdAt',
            width: 100,
            render: (v) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          },
          { title: 'Product', dataIndex: 'productName' },
          {
            title: 'Type',
            key: 'type',
            render: (_, r) => (
              <Tag color={MOVEMENT_TYPE_COLORS[r.type]}>
                {r.transactionLabel ?? MOVEMENT_TYPE_LABELS[r.type]}
              </Tag>
            ),
          },
          {
            title: 'Quantity',
            key: 'qty',
            align: 'right',
            render: (_, r) => {
              const v = r.qtyIn ?? r.qtyOut ?? Math.abs(r.quantity);
              const sign = r.qtyIn || (r.quantity > 0 && r.type !== 'stock_out' && r.type !== 'damaged') ? '+' : '-';
              return <span className={sign === '-' ? 'text-red-600 font-semibold' : 'text-emerald-700 font-semibold'}>{sign}{v}</span>;
            },
          },
          { title: 'Warehouse', dataIndex: 'warehouseId', render: (id) => warehouseName(id) },
          { title: 'User', dataIndex: 'createdBy' },
        ]}
      />
    </>
  );
}

export function StockLedgerPanel({ movements }: { movements: StockMovement[] }) {
  const [sku, setSku] = useState('HP-LP-15');
  const [warehouseId, setWarehouseId] = useState('wh-001');

  const productOptions = Array.from(
    new Map(STOCK_AVAILABILITY.map((s) => [s.sku, { value: s.sku, label: `${s.productName} (${s.sku})` }])).values()
  );

  const ledger: StockLedgerEntry[] = useMemo(() => {
    const fromSeed = STOCK_LEDGER.filter((e) => e.sku === sku && e.warehouseId === warehouseId);
    if (fromSeed.length) return fromSeed;

    const productMovements = movements
      .filter((m) => m.sku === sku && m.warehouseId === warehouseId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let balance = 0;
    return productMovements.map((m, i) => {
      const qtyIn = m.qtyIn ?? (m.quantity > 0 && m.type !== 'stock_out' && m.type !== 'damaged' ? m.quantity : null);
      const qtyOut = m.qtyOut ?? (m.type === 'stock_out' || m.type === 'damaged' ? Math.abs(m.quantity) : null);
      if (qtyIn) balance += qtyIn;
      if (qtyOut) balance -= qtyOut;
      return {
        id: m.id,
        sku: m.sku,
        productName: m.productName,
        warehouseId: m.warehouseId,
        date: new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        transaction: m.transactionLabel ?? MOVEMENT_TYPE_LABELS[m.type],
        qtyIn,
        qtyOut,
        balance,
      };
    });
  }, [sku, warehouseId, movements]);

  const productName = STOCK_AVAILABILITY.find((s) => s.sku === sku)?.productName ?? sku;

  return (
    <div className="space-y-4">
      <Paragraph type="secondary">
        Running transaction history per product — trace every stock change from opening balance to present.
      </Paragraph>
      <Space wrap className="mb-4">
        <Select value={sku} onChange={setSku} options={productOptions} className="min-w-[220px]" />
        <Select value={warehouseId} onChange={setWarehouseId} options={warehouseOptions} className="min-w-[200px]" />
      </Space>

      <Card className="!rounded-xl" style={{ background: `linear-gradient(180deg, ${BRAND}06 0%, white 100%)` }}>
        <Title level={5} className="!mb-1">Stock Card — {productName}</Title>
        <Text type="secondary" className="text-xs">{warehouseName(warehouseId)} · {sku}</Text>
        <Divider className="!my-3" />
        <Table<StockLedgerEntry>
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={ledger}
          columns={[
            { title: 'Date', dataIndex: 'date' },
            { title: 'Transaction', dataIndex: 'transaction' },
            {
              title: 'In',
              dataIndex: 'qtyIn',
              align: 'right',
              render: (v) => (v != null ? <span className="text-emerald-700 font-semibold">{v}</span> : '—'),
            },
            {
              title: 'Out',
              dataIndex: 'qtyOut',
              align: 'right',
              render: (v) => (v != null ? <span className="text-red-600 font-semibold">{v}</span> : '—'),
            },
            {
              title: 'Balance',
              dataIndex: 'balance',
              align: 'right',
              render: (v) => <strong style={{ color: BRAND }}>{v}</strong>,
            },
          ]}
        />
        {ledger.length > 0 && (
          <Descriptions column={2} size="small" className="mt-4">
            <Descriptions.Item label="Opening balance">{ledger[0]?.balance - (ledger[0]?.qtyIn ?? 0) + (ledger[0]?.qtyOut ?? 0)}</Descriptions.Item>
            <Descriptions.Item label="Current balance">{ledger[ledger.length - 1]?.balance}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </div>
  );
}
