'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Descriptions,
  Result,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { BRAND } from '../../../lib/brand';
import {
  MOVEMENT_TYPE_COLORS,
  fetchStockMovementById,
  formatMovementDate,
  formatMovementPerson,
  movementTypeLabel,
  referenceHref,
  type StockMovement,
} from '../../../lib/stockMovementsApi';

const { Title, Text } = Typography;

function warehouseLabel(code: string, name: string): string {
  if (code && name) return `${code} — ${name}`;
  return name || code || '—';
}

function locationLabel(
  loc: { code: string; name: string } | null
): string {
  if (!loc) return '—';
  if (loc.code && loc.name) return `${loc.code} — ${loc.name}`;
  return loc.name || loc.code || '—';
}

export default function StockMovementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [movement, setMovement] = useState<StockMovement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const m = await fetchStockMovementById(id);
      setMovement(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load movement');
      setMovement(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !movement) {
    return (
      <DashboardLayout>
        <Result
          status="404"
          title="Movement not found"
          subTitle={error ?? 'This stock movement does not exist.'}
          extra={
            <Button type="primary" onClick={() => router.push('/dashboard/stock-movements')}>
              Back to ledger
            </Button>
          }
        />
      </DashboardLayout>
    );
  }

  const refLink = referenceHref(movement.referenceType, movement.referenceId);
  const delta = movement.quantityDelta;
  const showsDest =
    movement.type === 'internal_move' ||
    movement.type === 'transfer_out' ||
    movement.type === 'transfer_in' ||
    Boolean(movement.toWarehouse?.id);

  return (
    <DashboardLayout>
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
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Title level={3} className="!mb-0 font-mono" style={{ color: BRAND }}>
              {movement.movementNumber || '—'}
            </Title>
            <Tag color={MOVEMENT_TYPE_COLORS[movement.type] ?? 'default'}>
              {movementTypeLabel(movement.type)}
            </Tag>
          </div>
          <Text type="secondary">
            {formatMovementDate(movement.createdAt)} · by{' '}
            {formatMovementPerson(movement.createdBy)}
          </Text>
        </div>

        <Card>
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="Product" span={2}>
              <div className="font-medium">{movement.product.name}</div>
              {movement.product.sku && (
                <Text type="secondary" className="font-mono text-xs">
                  {movement.product.sku}
                </Text>
              )}
              <div className="mt-1 text-xs text-slate-500">
                Current catalog stock: {movement.product.stockQuantity}
              </div>
            </Descriptions.Item>

            <Descriptions.Item label={showsDest ? 'From warehouse' : 'Warehouse'}>
              {warehouseLabel(movement.warehouse.code, movement.warehouse.name)}
            </Descriptions.Item>
            <Descriptions.Item label={showsDest ? 'From location' : 'Location'}>
              {locationLabel(movement.location)}
            </Descriptions.Item>

            {showsDest && (
              <>
                <Descriptions.Item label="To warehouse">
                  {movement.toWarehouse
                    ? warehouseLabel(movement.toWarehouse.code, movement.toWarehouse.name)
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="To location">
                  {locationLabel(movement.toLocation)}
                </Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Quantity">{movement.quantity}</Descriptions.Item>
            <Descriptions.Item label="Delta">
              <span
                className={
                  delta > 0
                    ? 'font-semibold text-emerald-600'
                    : delta < 0
                      ? 'font-semibold text-red-600'
                      : ''
                }
              >
                {delta > 0 ? `+${delta}` : delta}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Balance after">
              {movement.balanceAfter != null ? movement.balanceAfter : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Sync product stock">
              {movement.syncProductStock ? 'Yes' : 'No'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes" span={2}>
              {movement.notes || '—'}
            </Descriptions.Item>
            {(movement.referenceType || movement.referenceId) && (
              <Descriptions.Item label="Reference" span={2}>
                {refLink ? (
                  <button
                    type="button"
                    className="hover:underline"
                    style={{ color: BRAND }}
                    onClick={() => router.push(refLink)}
                  >
                    {movement.referenceType === 'StockTransfer' ||
                    movement.referenceType === 'WarehouseTransfer'
                      ? `From transfer`
                      : movement.referenceType || 'Reference'}{' '}
                    · {movement.referenceId}
                  </button>
                ) : (
                  <span>
                    {movement.referenceType || '—'}
                    {movement.referenceId ? ` · ${movement.referenceId}` : ''}
                  </span>
                )}
              </Descriptions.Item>
            )}
          </Descriptions>

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Stock movements are append-only. To reverse a change, record a correcting movement.
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
