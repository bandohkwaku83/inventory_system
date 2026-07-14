'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, ClearOutlined, SearchOutlined } from '@ant-design/icons';
import { useProducts } from '../../context/ProductsContext';
import { useActionLoader } from '../LoaderProvider';
import {
  assignProductLocation,
  clearProductLocation,
  storableLocationsFromStructure,
  type LocationNode,
  type WarehouseInventoryItem,
  type WarehousesMeta,
} from '../../lib/warehousesApi';

const { Text } = Typography;

type Props = {
  warehouseId: string;
  warehouseActive: boolean;
  meta: WarehousesMeta;
  structure: LocationNode[];
  items: WarehouseInventoryItem[];
  loading: boolean;
  total: number;
  onRefresh: () => Promise<void>;
};

export function InventoryPanel({
  warehouseId,
  warehouseActive,
  meta,
  structure,
  items,
  loading,
  total,
  onRefresh,
}: Props) {
  const router = useRouter();
  const { visibleProducts } = useProducts();
  const { runWithLoader } = useActionLoader();

  const [search, setSearch] = useState('');
  const [binFilter, setBinFilter] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignProductId, setAssignProductId] = useState<string | undefined>();
  const [assignLocationId, setAssignLocationId] = useState<string | undefined>();
  const [editingRow, setEditingRow] = useState<WarehouseInventoryItem | null>(null);

  const bins = useMemo(
    () => storableLocationsFromStructure(structure, meta.storableTypes ?? ['bin']),
    [structure, meta.storableTypes]
  );

  const filtered = useMemo(() => {
    let list = items;
    if (inStockOnly) list = list.filter((i) => i.quantity > 0);
    if (binFilter === 'unassigned') {
      list = list.filter((i) => !i.locationId);
    } else if (binFilter !== 'all') {
      list = list.filter((i) => i.locationId === binFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.productName.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.locationCode.toLowerCase().includes(q) ||
          i.locationFullPath.toLowerCase().includes(q) ||
          i.locationName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, search, binFilter, inStockOnly]);

  const openAssign = (row?: WarehouseInventoryItem) => {
    setEditingRow(row ?? null);
    setAssignProductId(row?.productId);
    setAssignLocationId(row?.locationId ?? undefined);
    setAssignOpen(true);
  };

  const saveAssign = async () => {
    if (!assignProductId || !assignLocationId) {
      message.error('Select a product and a bin');
      return;
    }
    if (!warehouseActive) {
      message.error('Cannot stock an inactive warehouse');
      return;
    }
    await runWithLoader(async () => {
      await assignProductLocation(warehouseId, {
        productId: assignProductId,
        locationId: assignLocationId,
      });
      message.success(editingRow ? 'Bin updated' : 'Product assigned to bin');
      setAssignOpen(false);
      await onRefresh();
    });
  };

  const clearBin = async (row: WarehouseInventoryItem) => {
    await runWithLoader(async () => {
      await clearProductLocation(warehouseId, row.productId);
      message.success('Bin assignment cleared');
      await onRefresh();
    });
  };

  const columns: TableProps<WarehouseInventoryItem>['columns'] = [
    {
      title: 'Product',
      key: 'product',
      render: (_, r) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{r.productName}</p>
          <p className="font-mono text-xs text-slate-500">{r.sku || '—'}</p>
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, r) => {
        const path = r.locationFullPath || r.locationCode;
        return path ? (
          <div>
            <Tag color="green" className="!mb-0 !font-mono !text-[11px]">
              {path}
            </Tag>
            {r.locationName ? (
              <p className="mt-0.5 mb-0 text-xs text-slate-500">{r.locationName}</p>
            ) : null}
          </div>
        ) : (
          <Text type="secondary">Unassigned</Text>
        );
      },
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      align: 'right',
      width: 90,
      render: (q: number, r) => (
        <span>
          {q}
          {r.unit ? <span className="text-slate-400"> {r.unit}</span> : null}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 260,
      render: (_, r) => (
        <Space size="small" wrap>
          <Button
            size="small"
            disabled={!warehouseActive || bins.length === 0}
            onClick={() => openAssign(r)}
          >
            {r.locationId ? 'Change bin' : 'Assign bin'}
          </Button>
          {r.locationId && (
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={() => void clearBin(r)}
            >
              Clear
            </Button>
          )}
          <Button
            size="small"
            type="text"
            className="!text-slate-500"
            disabled={!warehouseActive}
            onClick={() =>
              router.push(
                `/dashboard/stock-movements/new?type=adjustment&warehouseId=${encodeURIComponent(warehouseId)}&productId=${encodeURIComponent(r.productId)}`
              )
            }
          >
            Quick adjust
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
        One product per warehouse has a single stock row. The bin is where it lives — not a
        multi-bin quantity split. Global catalog stock stays on the product; warehouse qty is
        the breakdown.
      </div>

      {!warehouseActive && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This warehouse is inactive. You can view inventory, but stocking and new assignments
          are blocked.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          allowClear
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Search product, SKU, or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={binFilter}
          onChange={setBinFilter}
          className="w-56"
          options={[
            { value: 'all', label: 'All locations' },
            { value: 'unassigned', label: 'Unassigned' },
            ...bins.map((b) => ({
              value: b.id,
              label: `${b.fullPath || b.code} — ${b.name}`,
            })),
          ]}
          showSearch
          optionFilterProp="label"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Switch size="small" checked={inStockOnly} onChange={setInStockOnly} />
          In-stock only
        </label>
        <div className="ml-auto">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!warehouseActive || bins.length === 0}
            onClick={() => openAssign()}
          >
            Assign product
          </Button>
        </div>
      </div>

      {bins.length === 0 && (
        <Text type="secondary" className="block text-xs">
          Create at least one bin under Locations before assigning products.
        </Text>
      )}

      <Table<WarehouseInventoryItem>
        size="small"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        pagination={{
          pageSize: 10,
          showTotal: () => `${filtered.length} of ${total} rows`,
        }}
      />

      <Modal
        title={editingRow ? 'Change bin' : 'Assign product to bin'}
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={() => void saveAssign()}
        okText="Save"
        destroyOnHidden
      >
        <div className="mt-4 space-y-4">
          <div>
            <Text type="secondary" className="mb-1 block text-xs">
              Product
            </Text>
            <Select
              className="w-full"
              showSearch
              optionFilterProp="label"
              placeholder="Search products"
              disabled={Boolean(editingRow)}
              value={assignProductId}
              onChange={setAssignProductId}
              options={visibleProducts.map((p) => ({
                value: p.id,
                label: `${p.name}${p.sku ? ` (${p.sku})` : ''}`,
              }))}
            />
          </div>
          <div>
            <Text type="secondary" className="mb-1 block text-xs">
              Bin ({(meta.storableTypes ?? ['bin']).join(', ')})
            </Text>
            <Select
              className="w-full"
              showSearch
              optionFilterProp="label"
              placeholder="Select bin"
              value={assignLocationId}
              onChange={setAssignLocationId}
              options={bins.map((b) => ({
                value: b.id,
                label: `${b.fullPath || b.code} — ${b.name}`,
              }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
