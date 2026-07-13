'use client';

import React, { useMemo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import {
  Inventory2 as InventoryIcon,
  LocalShipping as LocalShippingIcon,
  Storefront as StorefrontIcon,
  LocalOffer as LocalOfferIcon,
  WarningAmber as WarningIcon,
  Sell as SellIcon,
  SwapHoriz as SwapHorizIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import {
  formatChangePercent,
  formatDashboardCurrency,
  type DashboardData,
  type DashboardSummary,
} from '../../lib/dashboardApi';
import {
  BRAND,
  DashboardError,
  DashboardHeader,
  QuickActionsSection,
  SectionCard,
  StatCardsGrid,
  filterQuickActions,
  type QuickAction,
  type StatCard,
} from './shared';
import { useGreeting } from './useDashboardData';

interface RecentRestock {
  id: string;
  item: string;
  quantity: string;
  supplier: string;
  date: string;
}

const recentRestocksColumns: TableProps<RecentRestock>['columns'] = [
  {
    title: 'Item',
    dataIndex: 'item',
    key: 'item',
    render: (text: string) => (
      <span className="text-[12px] font-semibold text-slate-700">{text}</span>
    ),
  },
  {
    title: 'Quantity',
    dataIndex: 'quantity',
    key: 'quantity',
    render: (text: string) => <span className="text-[12px] text-slate-700">{text}</span>,
  },
  {
    title: 'Supplier',
    dataIndex: 'supplier',
    key: 'supplier',
    render: (text: string) => <span className="text-[12px] text-slate-500">{text}</span>,
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    render: (text: string) => <span className="text-[12px] text-slate-500">{text}</span>,
  },
];

const INVENTORY_QUICK_ACTIONS: QuickAction[] = [
  { key: 'inventory', label: 'Stock Levels', icon: InventoryIcon, href: '/dashboard/inventory' },
  { key: 'products', label: 'Products', icon: StorefrontIcon, href: '/dashboard/products' },
  { key: 'restock', label: 'New Purchase', icon: LocalShippingIcon, href: '/dashboard/purchases' },
  { key: 'transfer', label: 'Stock Transfer', icon: SwapHorizIcon, href: '/dashboard/stock' },
  { key: 'warehouses', label: 'Warehouses', icon: LocationOnIcon, href: '/dashboard/warehouses' },
  { key: 'stock', label: 'Stock Management', icon: InventoryIcon, href: '/dashboard/stock' },
  { key: 'suppliers', label: 'Suppliers', icon: LocalOfferIcon, href: '/dashboard/suppliers' },
  { key: 'price-list', label: 'Price List', icon: SellIcon, href: '/dashboard/price-list' },
];

export default function InventoryDashboard({
  dashboard,
  summary,
  error,
  canAccess,
}: {
  dashboard: DashboardData | null;
  summary: DashboardSummary | null;
  error: string | null;
  canAccess: (path: string) => boolean;
}) {
  const { greeting, dateLabel } = useGreeting();
  const currency = dashboard?.currency ?? 'GHS';

  const stats: StatCard[] = useMemo(() => {
    const m = dashboard?.metrics;
    const cards: StatCard[] = [];

    if (canAccess('/dashboard/inventory')) {
      cards.push({
        key: 'inventory',
        label: 'Total Products',
        value: (m?.inventoryItems.value ?? summary?.products.total ?? 0).toLocaleString('en-US'),
        delta: formatChangePercent(m?.inventoryItems.changePercent ?? 0),
        icon: InventoryIcon,
        href: '/dashboard/inventory',
        accent: BRAND,
      });
    }
    if (canAccess('/dashboard/inventory')) {
      cards.push({
        key: 'low-stock',
        label: 'Low Stock Items',
        value: String(summary?.products.lowStock ?? 0),
        icon: WarningIcon,
        href: '/dashboard/inventory',
        accent: '#ea580c',
      });
    }
    if (canAccess('/dashboard/suppliers')) {
      cards.push({
        key: 'suppliers',
        label: 'Active Suppliers',
        value: String(summary?.suppliers.active ?? 0),
        icon: LocalOfferIcon,
        href: '/dashboard/suppliers',
        accent: '#7c3aed',
      });
    }
    if (canAccess('/dashboard/purchases')) {
      cards.push({
        key: 'purchases',
        label: 'Open Purchases',
        value: String(summary?.purchases.outstanding ?? 0),
        icon: LocalShippingIcon,
        href: '/dashboard/purchases',
        accent: '#0284c7',
      });
    }

    return cards;
  }, [dashboard, summary, canAccess]);

  const recentRestocks: RecentRestock[] = useMemo(
    () =>
      (dashboard?.recentRestocks ?? []).slice(0, 5).map((r) => ({
        id: r._id || `${r.purchaseId}-${r.productId}-${r.date}`,
        item: r.item,
        quantity: r.quantityLabel,
        supplier: r.supplier,
        date: r.date,
      })),
    [dashboard]
  );

  const quickActions = filterQuickActions(INVENTORY_QUICK_ACTIONS, canAccess);

  return (
    <div className="space-y-5 sm:space-y-6">
      {error ? <DashboardError message={error} /> : null}
      <DashboardHeader
        dateLabel={dateLabel}
        greeting={greeting}
        subtitle="Manage stock levels, suppliers, and purchase orders"
        primaryAction={
          canAccess('/dashboard/purchases')
            ? { label: 'New Purchase', href: '/dashboard/purchases', icon: LocalShippingIcon }
            : canAccess('/dashboard/inventory')
              ? { label: 'View Stock', href: '/dashboard/inventory', icon: InventoryIcon }
              : undefined
        }
      />
      {stats.length > 0 ? <StatCardsGrid stats={stats} /> : null}
      <QuickActionsSection
        actions={quickActions}
        title="Inventory shortcuts"
        description="Stock management at a glance"
      />
      {(summary?.products.lowStock ?? 0) > 0 && canAccess('/dashboard/inventory') ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-amber-900">
            {summary?.products.lowStock} product{(summary?.products.lowStock ?? 0) !== 1 ? 's' : ''}{' '}
            running low on stock
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Review inventory levels and create purchase orders to restock.
          </p>
        </div>
      ) : null}
      {canAccess('/dashboard/purchases') ? (
        <SectionCard
          title="Recent restocks"
          subtitle="Latest inventory updates"
          href="/dashboard/purchases"
          icon={LocalShippingIcon}
        >
          <Table<RecentRestock>
            columns={recentRestocksColumns}
            dataSource={recentRestocks}
            pagination={false}
            size="small"
            rowKey="id"
            scroll={{ x: 420 }}
          />
        </SectionCard>
      ) : null}
      {summary?.sales && canAccess('/dashboard/reports') ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
            Sales context
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatDashboardCurrency(summary.sales.revenue, summary.sales.currency || currency)}
          </p>
          <p className="text-xs text-slate-500">
            {summary.sales.count} transactions recorded — helps plan restocking
          </p>
        </div>
      ) : null}
    </div>
  );
}
