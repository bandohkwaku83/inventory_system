'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useWarehouses } from '../../context/WarehousesContext';
import { useProducts } from '../../context/ProductsContext';
import {
  binsFromStructure,
  fetchWarehouseInventory,
  fetchWarehouseStructure,
  type LocationNode,
} from '../../lib/warehousesApi';
import {
  CREATABLE_TYPE_GROUPS,
  MOVEMENT_TYPE_LABELS,
  OUTBOUND_TYPES,
  createStockMovement,
  fetchStockMovementsMeta,
  movementTypeLabel,
  type CreateStockMovementResult,
  type StockMovementType,
} from '../../lib/stockMovementsApi';
import { BRAND } from '../../lib/brand';

const { Title, Text } = Typography;

type FormValues = {
  productId: string;
  warehouseId: string;
  toWarehouseId?: string;
  locationId?: string;
  toLocationId?: string;
  quantity: number;
  notes?: string;
  syncProductStock?: boolean;
};

function SuccessSummary({ result }: { result: CreateStockMovementResult }) {
  const { movement, warehouseStock, toWarehouseStock } = result;
  return (
    <div className="space-y-2 text-sm">
      <div>
        Recorded{' '}
        <span className="font-mono font-semibold" style={{ color: BRAND }}>
          {movement.movementNumber}
        </span>{' '}
        ({movementTypeLabel(movement.type)})
      </div>
      {warehouseStock && (
        <div>
          Source warehouse balance: <strong>{warehouseStock.quantity}</strong>
        </div>
      )}
      {toWarehouseStock && (
        <div>
          Destination warehouse balance: <strong>{toWarehouseStock.quantity}</strong>
        </div>
      )}
      {movement.balanceAfter != null && !warehouseStock && (
        <div>
          Balance after: <strong>{movement.balanceAfter}</strong>
        </div>
      )}
      {movement.syncProductStock && (
        <div>
          Product stock (global): <strong>{movement.product.stockQuantity}</strong>
        </div>
      )}
      {!movement.syncProductStock && (
        <Text type="secondary">Product global stock was not changed.</Text>
      )}
    </div>
  );
}

export function StockMovementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouses, warehousesLoading } = useWarehouses();
  const { visibleProducts } = useProducts();
  const [form] = Form.useForm<FormValues>();

  const presetType = searchParams.get('type') as StockMovementType | null;
  const presetWarehouseId = searchParams.get('warehouseId') ?? '';
  const presetProductId = searchParams.get('productId') ?? '';

  const [creatableTypes, setCreatableTypes] = useState<StockMovementType[]>([]);
  const [type, setType] = useState<StockMovementType | null>(
    presetType && MOVEMENT_TYPE_LABELS[presetType] ? presetType : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CreateStockMovementResult | null>(null);

  const [fromBins, setFromBins] = useState<LocationNode[]>([]);
  const [toBins, setToBins] = useState<LocationNode[]>([]);
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [availLoading, setAvailLoading] = useState(false);

  const warehouseId = Form.useWatch('warehouseId', form);
  const productId = Form.useWatch('productId', form);
  const toWarehouseId = Form.useWatch('toWarehouseId', form);

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === 'active'),
    [warehouses]
  );

  const inactiveSelected = useMemo(() => {
    if (!warehouseId) return false;
    const wh = warehouses.find((w) => w.id === warehouseId);
    return wh ? wh.status !== 'active' : false;
  }, [warehouseId, warehouses]);

  useEffect(() => {
    void fetchStockMovementsMeta()
      .then((meta) => {
        setCreatableTypes(meta.creatableTypes);
        if (presetType && meta.creatableTypes.includes(presetType)) {
          setType(presetType);
        }
      })
      .catch(() => setCreatableTypes(CREATABLE_TYPE_GROUPS.flatMap((g) => g.types)));
  }, [presetType]);

  useEffect(() => {
    if (presetWarehouseId || presetProductId) {
      form.setFieldsValue({
        warehouseId: presetWarehouseId || undefined,
        productId: presetProductId || undefined,
      });
    }
  }, [presetWarehouseId, presetProductId, form]);

  const loadBins = useCallback(async (whId: string, setBins: (b: LocationNode[]) => void) => {
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
    void loadBins(warehouseId ?? '', setFromBins);
  }, [warehouseId, loadBins]);

  useEffect(() => {
    void loadBins(toWarehouseId ?? '', setToBins);
  }, [toWarehouseId, loadBins]);

  useEffect(() => {
    if (!type || !OUTBOUND_TYPES.has(type) || !warehouseId || !productId) {
      setAvailableQty(null);
      return;
    }
    let cancelled = false;
    setAvailLoading(true);
    void fetchWarehouseInventory(warehouseId, { page: 1, limit: 200, inStock: true })
      .then((data) => {
        if (cancelled) return;
        const qty = data.items
          .filter((i) => i.productId === productId)
          .reduce((s, i) => s + i.quantity, 0);
        setAvailableQty(qty);
      })
      .catch(() => {
        if (!cancelled) setAvailableQty(null);
      })
      .finally(() => {
        if (!cancelled) setAvailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, warehouseId, productId]);

  const typeGroups = useMemo(() => {
    const allowed = new Set(creatableTypes.length ? creatableTypes : CREATABLE_TYPE_GROUPS.flatMap((g) => g.types));
    return CREATABLE_TYPE_GROUPS.map((g) => ({
      ...g,
      types: g.types.filter((t) => allowed.has(t)),
    })).filter((g) => g.types.length > 0);
  }, [creatableTypes]);

  const isAdjustment = type === 'adjustment';
  const isInternalMove = type === 'internal_move';
  const isOutbound = type ? OUTBOUND_TYPES.has(type) : false;

  const onSubmit = async (values: FormValues) => {
    if (!type) {
      message.error('Select a movement type');
      return;
    }
    if (inactiveSelected) {
      message.error('Cannot record movements for an inactive warehouse');
      return;
    }
    if (isAdjustment && values.quantity === 0) {
      message.error('Adjustment amount cannot be zero');
      return;
    }
    if (!isAdjustment && values.quantity <= 0) {
      message.error('Quantity must be greater than zero');
      return;
    }
    if (isInternalMove && !values.toWarehouseId) {
      message.error('Select a destination warehouse');
      return;
    }
    if (isInternalMove && values.toWarehouseId === values.warehouseId) {
      message.error('Source and destination warehouses must differ');
      return;
    }
    if (isOutbound && availableQty != null && Math.abs(values.quantity) > availableQty) {
      message.error(`Insufficient stock. Available: ${availableQty}`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createStockMovement({
        type,
        productId: values.productId,
        warehouseId: values.warehouseId,
        quantity: values.quantity,
        locationId: values.locationId || null,
        toWarehouseId: isInternalMove ? values.toWarehouseId || null : null,
        toLocationId: isInternalMove ? values.toLocationId || null : null,
        notes: values.notes?.trim() || undefined,
        syncProductStock:
          values.syncProductStock === undefined ? undefined : values.syncProductStock,
      });
      setSuccess(result);
      message.success(`Recorded ${result.movement.movementNumber}`);
      setTimeout(() => {
        router.push(`/dashboard/stock-movements/${result.movement.id}`);
      }, 900);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to record movement');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card>
        <Alert
          type="success"
          showIcon
          message="Movement recorded"
          description={<SuccessSummary result={success} />}
        />
        <div className="mt-4">
          <Button
            type="primary"
            onClick={() => router.push(`/dashboard/stock-movements/${success.movement.id}`)}
          >
            View receipt
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Button
          type="link"
          className="!px-0"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/dashboard/stock-movements')}
        >
          Stock movements
        </Button>
        <Title level={3} className="!mb-1 !mt-1">
          Record movement
        </Title>
        <Text type="secondary">
          Stock updates immediately on submit. Transfers write their own ledger rows — use
          this form for receiving, issues, counts, and relocations.
        </Text>
      </div>

      <Card title="1. Movement type" size="small">
        {typeGroups.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <Text type="secondary" className="text-xs uppercase tracking-wide">
              {group.label}
            </Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.types.map((t) => (
                <Button
                  key={t}
                  type={type === t ? 'primary' : 'default'}
                  onClick={() => {
                    setType(t);
                    form.setFieldsValue({
                      quantity: t === 'adjustment' ? undefined : 1,
                      toWarehouseId: undefined,
                      toLocationId: undefined,
                    });
                  }}
                >
                  {MOVEMENT_TYPE_LABELS[t] ?? t}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </Card>

      {type && (
        <Card
          title={`2. Details — ${MOVEMENT_TYPE_LABELS[type] ?? type}`}
          size="small"
        >
          {isInternalMove && (
            <Alert
              className="mb-4"
              type="info"
              showIcon
              message="Does not change total product stock — moves between warehouses"
            />
          )}
          {inactiveSelected && (
            <Alert
              className="mb-4"
              type="error"
              showIcon
              message="Selected warehouse is inactive. Choose an active warehouse."
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={(v) => void onSubmit(v)}
            initialValues={{ syncProductStock: true }}
          >
            <Form.Item
              name="productId"
              label="Product"
              rules={[{ required: true, message: 'Select a product' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select product"
                options={visibleProducts.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="warehouseId"
              label={isInternalMove ? 'From warehouse' : 'Warehouse'}
              rules={[{ required: true, message: 'Select a warehouse' }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={warehousesLoading}
                placeholder="Select warehouse"
                options={activeWarehouses.map((w) => ({
                  value: w.id,
                  label: `${w.code} — ${w.name}`,
                }))}
              />
            </Form.Item>

            {isInternalMove && (
              <Form.Item
                name="toWarehouseId"
                label="To warehouse"
                rules={[{ required: true, message: 'Select destination warehouse' }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select destination"
                  options={activeWarehouses
                    .filter((w) => w.id !== warehouseId)
                    .map((w) => ({
                      value: w.id,
                      label: `${w.code} — ${w.name}`,
                    }))}
                />
              </Form.Item>
            )}

            <Form.Item name="locationId" label="Location / bin (optional)">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={fromBins.length ? 'Select bin' : 'No bins'}
                disabled={!warehouseId || fromBins.length === 0}
                options={fromBins.map((b) => ({
                  value: b.id,
                  label: `${b.code} — ${b.name}`,
                }))}
              />
            </Form.Item>

            {isInternalMove && (
              <Form.Item name="toLocationId" label="Destination bin (optional)">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={toBins.length ? 'Select bin' : 'No bins'}
                  disabled={!toWarehouseId || toBins.length === 0}
                  options={toBins.map((b) => ({
                    value: b.id,
                    label: `${b.code} — ${b.name}`,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item
              name="quantity"
              label={
                isAdjustment ? 'Adjustment amount (+ or −)' : 'Quantity'
              }
              extra={
                isAdjustment
                  ? 'Use a positive number to increase stock, negative to decrease. Zero is not allowed.'
                  : isOutbound && availableQty != null
                    ? `Available at warehouse: ${availableQty}${availLoading ? '…' : ''}`
                    : undefined
              }
              rules={[
                { required: true, message: 'Enter quantity' },
                {
                  validator: async (_, value) => {
                    if (value === undefined || value === null) return;
                    if (isAdjustment) {
                      if (value === 0) throw new Error('Cannot be zero');
                      return;
                    }
                    if (typeof value === 'number' && value <= 0) {
                      throw new Error('Must be greater than zero');
                    }
                  },
                },
              ]}
            >
              <InputNumber
                className="w-full"
                precision={0}
                min={isAdjustment ? undefined : 1}
              />
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={2} placeholder="Optional notes" />
            </Form.Item>

            {!isInternalMove && (
              <Collapse
                ghost
                items={[
                  {
                    key: 'advanced',
                    label: <Text type="secondary">Advanced</Text>,
                    children: (
                      <Form.Item
                        name="syncProductStock"
                        label="Sync product stock"
                        valuePropName="checked"
                        extra="When off, only warehouse stock changes (rare)."
                      >
                        <Switch />
                      </Form.Item>
                    ),
                  },
                ]}
              />
            )}

            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={submitting}
                disabled={inactiveSelected}
              >
                Record movement
              </Button>
              <Button onClick={() => router.push('/dashboard/stock-movements')}>Cancel</Button>
            </Space>
          </Form>
        </Card>
      )}
    </div>
  );
}
