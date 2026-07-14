'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  DatePicker,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DashboardLayout from '../../components/DashboardLayout';
import { useWarehouses } from '../../context/WarehousesContext';
import { useProducts } from '../../context/ProductsContext';
import { BRAND } from '../../lib/brand';
import {
  MOVEMENT_TYPE_COLORS,
  fetchStockMovements,
  fetchStockMovementsMeta,
  formatMovementDate,
  formatMovementPerson,
  movementTypeLabel,
  type StockMovement,
  type StockMovementType,
} from '../../lib/stockMovementsApi';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const QUICK_TYPES: StockMovementType[] = ['stock_in', 'stock_out', 'adjustment'];

function defaultDateRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')];
}

function StockMovementsListInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouses, warehousesLoading } = useWarehouses();
  const { visibleProducts } = useProducts();

  const initialWarehouse = searchParams.get('warehouseId') ?? '';
  const initialProduct = searchParams.get('productId') ?? '';
  const initialType = searchParams.get('type') ?? '';

  const [items, setItems] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>(initialType || 'all');
  const [warehouseFilter, setWarehouseFilter] = useState(initialWarehouse);
  const [productFilter, setProductFilter] = useState(initialProduct);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(defaultDateRange());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    void fetchStockMovementsMeta()
      .then((meta) => setTypes(meta.types))
      .catch(() => setTypes([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStockMovements({
        page,
        limit,
        type: typeFilter === 'all' ? undefined : typeFilter,
        warehouseId: warehouseFilter || undefined,
        productId: productFilter || undefined,
        from: dateRange?.[0]?.startOf('day').toISOString(),
        to: dateRange?.[1]?.endOf('day').toISOString(),
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load movements');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, warehouseFilter, productFilter, dateRange, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeOptions = useMemo(() => {
    const list = types.length
      ? types
      : [
          'stock_in',
          'stock_out',
          'adjustment',
          'opening_stock',
          'damaged',
          'returned',
          'internal_move',
          'transfer_out',
          'transfer_in',
        ];
    return [
      { value: 'all', label: 'All types' },
      ...list.map((t) => ({ value: t, label: movementTypeLabel(t) })),
    ];
  }, [types]);

  const columns: TableProps<StockMovement>['columns'] = [
    {
      title: 'Number',
      dataIndex: 'movementNumber',
      width: 110,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/stock-movements/${r.id}`)}
        >
          {v || '—'}
        </button>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      render: (t: string) => (
        <Tag color={MOVEMENT_TYPE_COLORS[t] ?? 'default'}>{movementTypeLabel(t)}</Tag>
      ),
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.product.name}</div>
          {r.product.sku && (
            <Text type="secondary" className="font-mono text-xs">
              {r.product.sku}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Warehouse',
      key: 'warehouse',
      render: (_, r) => (
        <div>
          <span className="font-mono text-xs text-slate-500">{r.warehouse.code}</span>
          <span className="ml-1">{r.warehouse.name || '—'}</span>
          {r.toWarehouse?.id ? (
            <div className="text-xs text-slate-500">
              → {r.toWarehouse.code} {r.toWarehouse.name}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 70,
      align: 'right',
    },
    {
      title: 'Delta',
      dataIndex: 'quantityDelta',
      width: 80,
      align: 'right',
      render: (d: number) => (
        <span
          className={
            d > 0
              ? 'font-semibold text-emerald-600'
              : d < 0
                ? 'font-semibold text-red-600'
                : ''
          }
        >
          {d > 0 ? `+${d}` : d}
        </span>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balanceAfter',
      width: 80,
      align: 'right',
      render: (v: number | null) => (v != null ? v : '—'),
    },
    {
      title: 'By',
      key: 'by',
      width: 120,
      ellipsis: true,
      render: (_, r) => formatMovementPerson(r.createdBy),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => (
        <span className="text-xs text-slate-600">{formatMovementDate(v)}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, r) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/dashboard/stock-movements/${r.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Title level={3} className="!mb-1">
            Stock movements
          </Title>
          <Text type="secondary">
            Append-only ledger of every quantity change. Record a movement to update stock
            immediately.
          </Text>
        </div>
        <Space wrap>
          {QUICK_TYPES.map((t) => (
            <Button
              key={t}
              onClick={() =>
                router.push(`/dashboard/stock-movements/new?type=${encodeURIComponent(t)}`)
              }
            >
              {movementTypeLabel(t)}
            </Button>
          ))}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/stock-movements/new')}
          >
            Record movement
          </Button>
        </Space>
      </div>

      <Card size="small">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            options={typeOptions}
            className="w-44"
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Warehouse"
            loading={warehousesLoading}
            value={warehouseFilter || undefined}
            onChange={(v) => {
              setWarehouseFilter(v ?? '');
              setPage(1);
            }}
            className="w-52"
            options={warehouses.map((w) => ({
              value: w.id,
              label: `${w.code} — ${w.name}`,
            }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Product"
            value={productFilter || undefined}
            onChange={(v) => {
              setProductFilter(v ?? '');
              setPage(1);
            }}
            className="w-56"
            options={visibleProducts.map((p) => ({
              value: p.id,
              label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
            }))}
          />
          <RangePicker
            value={dateRange}
            onChange={(v) => {
              setDateRange(v as [Dayjs, Dayjs] | null);
              setPage(1);
            }}
            allowClear
          />
          <Input
            allowClear
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search number or notes…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <Button
            onClick={() => {
              setSearch(searchInput);
              setPage(1);
            }}
          >
            Search
          </Button>
        </div>
      </Card>

      <Card>
        <Table<StockMovement>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          size="middle"
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t} movements`,
            onChange: (p) => setPage(p),
          }}
          onRow={(r) => ({
            onDoubleClick: () => router.push(`/dashboard/stock-movements/${r.id}`),
          })}
          locale={{ emptyText: 'No movements in this range' }}
        />
      </Card>
    </div>
  );
}

export default function StockMovementsListPage() {
  return (
    <DashboardLayout>
      <React.Suspense fallback={<Card loading />}>
        <StockMovementsListInner />
      </React.Suspense>
    </DashboardLayout>
  );
}
