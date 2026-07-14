'use client';

import React, { useMemo, useState } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import {
  Inventory2 as InventoryIcon,
  Receipt as ReceiptIcon,
  LocalShipping as LocalShippingIcon,
  PointOfSale as PointOfSaleIcon,
  AttachMoney as AttachMoneyIcon,
  PeopleAlt as PeopleAltIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
  AccountBalanceWallet as WalletIcon,
  ArrowForward as ArrowForwardIcon,
  LocationOn as LocationOnIcon,
  FactCheck as FactCheckIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell,
} from 'recharts';
import {
  formatChangePercent,
  formatDashboardCurrency,
  type DashboardData,
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
import LocationSelector from '../LocationSelector';
import {
  BUSINESS_LOCATIONS,
  formatEnterpriseCurrency,
} from '../../lib/enterpriseDummyData';

interface RecentSale {
  id: string;
  items: string;
  total: string;
  time: string;
}

interface RecentRestock {
  id: string;
  item: string;
  quantity: string;
  supplier: string;
  date: string;
}

const recentSalesColumns: TableProps<RecentSale>['columns'] = [
  {
    title: 'Receipt',
    dataIndex: 'id',
    key: 'id',
    render: (text: string) => (
      <span className="font-mono text-[12px] font-semibold text-slate-700">{text}</span>
    ),
  },
  {
    title: 'Items',
    dataIndex: 'items',
    key: 'items',
    render: (text: string) => <span className="text-[12px] text-slate-700">{text}</span>,
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    align: 'right',
    render: (text: string) => (
      <span className="text-[12px] font-bold" style={{ color: BRAND }}>
        {text}
      </span>
    ),
  },
  {
    title: 'Time',
    dataIndex: 'time',
    key: 'time',
    render: (text: string) => <span className="text-[12px] text-slate-500">{text}</span>,
  },
];

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

const ALL_QUICK_ACTIONS: QuickAction[] = [
  { key: 'pos', label: 'Open POS', icon: PointOfSaleIcon, href: '/dashboard/sales' },
  { key: 'add-product', label: 'Add Product', icon: AddIcon, href: '/dashboard/products' },
  { key: 'invoice', label: 'New Invoice', icon: DescriptionIcon, href: '/dashboard/proforma-invoices' },
  { key: 'expense', label: 'Record Expense', icon: AttachMoneyIcon, href: '/dashboard/expenses' },
  { key: 'restock', label: 'Restock', icon: LocalShippingIcon, href: '/dashboard/purchases' },
  { key: 'report', label: 'Sales Report', icon: AssessmentIcon, href: '/dashboard/reports' },
  { key: 'transfer', label: 'Stock Transfer', icon: LocalShippingIcon, href: '/dashboard/warehouse-transfers' },
  { key: 'warehouses', label: 'Warehouses', icon: LocationOnIcon, href: '/dashboard/warehouses' },
  { key: 'approvals', label: 'Approvals', icon: FactCheckIcon, href: '/dashboard/approvals' },
];

const BRANCH_COLORS = ['#25395c', '#7c3aed', '#0284c7', '#ea580c', '#059669'];

export default function AdminDashboard({
  dashboard,
  error,
  canAccess,
}: {
  dashboard: DashboardData | null;
  error: string | null;
  canAccess: (path: string) => boolean;
}) {
  const { greeting, dateLabel } = useGreeting();
  const [locationId, setLocationId] = useState('all');
  const currency = dashboard?.currency ?? 'GHS';
  const revenueSpark =
    dashboard?.salesPerformance.series.map((p) => p.revenue) ?? [0, 0, 0, 0, 0, 0, 0];

  const stats: StatCard[] = useMemo(() => {
    const m = dashboard?.metrics;
    const todaysDelta = formatChangePercent(m?.todaysSales.changePercent ?? 0);
    const revenueDelta = formatChangePercent(m?.revenue7d.changePercent ?? 0);
    const inventoryDelta = formatChangePercent(m?.inventoryItems.changePercent ?? 0);
    const customersDelta = formatChangePercent(m?.activeCustomers.changePercent ?? 0);

    return [
      {
        key: 'sales-today',
        label: "Today's Sales",
        value: formatDashboardCurrency(m?.todaysSales.value ?? 0, currency),
        delta: todaysDelta,
        icon: PointOfSaleIcon,
        href: '/dashboard/sales',
        accent: BRAND,
        spark: revenueSpark.length ? revenueSpark : [0],
      },
      {
        key: 'revenue-week',
        label: 'Revenue (7d)',
        value: formatDashboardCurrency(m?.revenue7d.value ?? 0, currency),
        delta: revenueDelta,
        icon: WalletIcon,
        href: '/dashboard/reports',
        accent: '#7c3aed',
        spark: revenueSpark.length ? revenueSpark : [0],
      },
      {
        key: 'inventory',
        label: 'Inventory Items',
        value: (m?.inventoryItems.value ?? 0).toLocaleString('en-US'),
        delta: inventoryDelta,
        icon: InventoryIcon,
        href: '/dashboard/inventory',
        accent: '#ea580c',
        spark: revenueSpark.length ? revenueSpark : [0],
      },
      {
        key: 'customers',
        label: 'Active Customers',
        value: (m?.activeCustomers.value ?? 0).toLocaleString('en-US'),
        delta: customersDelta,
        icon: PeopleAltIcon,
        href: '/dashboard/reports',
        accent: '#0284c7',
        spark: revenueSpark.length ? revenueSpark : [0],
      },
    ].filter((s) => canAccess(s.href));
  }, [dashboard, currency, revenueSpark, canAccess]);

  const dailySalesData = useMemo(
    () =>
      (dashboard?.salesPerformance.series ?? []).map((p) => ({
        name: p.day,
        sales: p.revenue,
      })),
    [dashboard]
  );

  const topSellingItems = useMemo(
    () =>
      (dashboard?.topProducts.items ?? []).map((p) => ({
        name: p.name,
        sales: p.quantity,
      })),
    [dashboard]
  );

  const recentSales: RecentSale[] = useMemo(
    () =>
      (dashboard?.recentSales ?? []).slice(0, 5).map((s) => ({
        id: s.receiptId,
        items: s.itemsSummary,
        total: formatDashboardCurrency(s.total, s.currency || currency),
        time: s.time,
      })),
    [dashboard, currency]
  );

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

  const quickActions = filterQuickActions(ALL_QUICK_ACTIONS, canAccess);

  const branchData = useMemo(() => {
    const locs =
      locationId === 'all'
        ? BUSINESS_LOCATIONS.filter((l) => l.status === 'active')
        : BUSINESS_LOCATIONS.filter((l) => l.id === locationId);
    return locs.map((l) => ({
      name: l.code,
      revenue: l.monthlyRevenue,
      stock: Math.round(l.stockValue / 1000),
      lowStock: l.lowStockCount,
    }));
  }, [locationId]);

  return (
    <div className="dashboard-stagger space-y-5 sm:space-y-6">
      {error ? <DashboardError message={error} /> : null}
      <DashboardHeader
        dateLabel={dateLabel}
        greeting={greeting}
        subtitle="Operations command center"
        actions={
          canAccess('/dashboard/warehouses') ? (
            <LocationSelector value={locationId} onChange={setLocationId} size="middle" />
          ) : undefined
        }
        primaryAction={
          canAccess('/dashboard/sales')
            ? { label: 'Open POS', href: '/dashboard/sales', icon: PointOfSaleIcon }
            : undefined
        }
      />
      {stats.length > 0 ? <StatCardsGrid stats={stats} /> : null}
      <QuickActionsSection actions={quickActions} />
      {(canAccess('/dashboard/reports') || canAccess('/dashboard/charts')) && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {canAccess('/dashboard/reports') ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2 sm:p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Sales performance</h2>
                  <p className="text-xs text-slate-500">Daily sales for the past 7 days</p>
                </div>
                <Link
                  href="/dashboard/reports"
                  className="inline-flex items-center gap-1 text-xs font-semibold transition hover:underline"
                  style={{ color: BRAND }}
                >
                  View report <ArrowForwardIcon className="!text-[0.95rem]" />
                </Link>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={dailySalesData.length ? dailySalesData : [{ name: '—', sales: 0 }]}
                  margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BRAND} stopOpacity={0.32} />
                      <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                      backgroundColor: 'white',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke={BRAND}
                    strokeWidth={2.25}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {canAccess('/dashboard/reports') ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4">
                <h2 className="text-sm font-bold text-slate-800">Top products</h2>
                <p className="text-xs text-slate-500">Best sellers this week</p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={topSellingItems.length ? topSellingItems : [{ name: 'No sales yet', sales: 0 }]}
                  layout="vertical"
                  margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={86}
                    stroke="#475569"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                      backgroundColor: 'white',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="sales" fill={BRAND} radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </section>
      )}
      {canAccess('/dashboard/warehouses') && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
                >
                  <LocationOnIcon className="!text-[1.05rem]" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Branch performance</h2>
                  <p className="text-xs text-slate-500">Monthly revenue by location</p>
                </div>
              </div>
              <Link
                href="/dashboard/warehouses"
                className="inline-flex items-center gap-1 text-xs font-semibold transition hover:underline"
                style={{ color: BRAND }}
              >
                All locations <ArrowForwardIcon className="!text-[0.95rem]" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={branchData} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}k`} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'revenue'
                      ? formatEnterpriseCurrency(value)
                      : `${value}k GHS stock`
                  }
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={36}>
                  {branchData.map((_, i) => (
                    <Cell key={i} fill={BRANCH_COLORS[i % BRANCH_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-800">Network snapshot</h2>
              <p className="text-xs text-slate-500">Live status across your locations</p>
            </div>
            <div className="space-y-3">
              {BUSINESS_LOCATIONS.filter((l) => l.status === 'active')
                .filter((l) => locationId === 'all' || l.id === locationId)
                .map((loc) => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 transition hover:border-slate-200 hover:bg-white"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{loc.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {loc.skuCount.toLocaleString()} SKUs · {loc.staffCount} staff
                      </p>
                    </div>
                    <div className="text-right">
                      {loc.monthlyRevenue > 0 ? (
                        <p className="text-sm font-bold" style={{ color: BRAND }}>
                          {formatEnterpriseCurrency(loc.monthlyRevenue)}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400">Warehouse</p>
                      )}
                      {loc.lowStockCount > 0 ? (
                        <p className="text-[10px] font-semibold text-amber-600">
                          {loc.lowStockCount} low stock
                        </p>
                      ) : (
                        <p className="text-[10px] font-semibold text-emerald-600">Stock OK</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
        {canAccess('/dashboard/receipts') ? (
          <SectionCard
            title="Recent sales"
            subtitle="Latest transactions"
            href="/dashboard/receipts"
            icon={ReceiptIcon}
          >
            <Table<RecentSale>
              columns={recentSalesColumns}
              dataSource={recentSales}
              pagination={false}
              size="small"
              rowKey="id"
              scroll={{ x: 420 }}
            />
          </SectionCard>
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
      </section>
    </div>
  );
}
