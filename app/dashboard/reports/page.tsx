'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Button,
  Table,
  Typography,
  DatePicker,
  Segmented,
  Tag,
  Empty,
  Select,
} from 'antd';
import type { TableProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  DownloadOutlined,
  WalletOutlined,
  MobileOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';
import { useSales, type Sale, type SalePaymentMethod } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';
import { isAdminRole } from '../../lib/permissions';

dayjs.extend(isoWeek);

const { Title, Text } = Typography;

const CASH_COLOR = '#1a2842';
const MOMO_COLOR = '#f59e0b';

const currency = (v: number) =>
  `GHS ${v.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type Period = 'day' | 'week' | 'month';
type MethodFilter = 'all' | SalePaymentMethod;

function periodRange(period: Period, anchor: Dayjs): [Dayjs, Dayjs] {
  switch (period) {
    case 'day':
      return [anchor.startOf('day'), anchor.endOf('day')];
    case 'week':
      return [anchor.startOf('isoWeek'), anchor.endOf('isoWeek')];
    case 'month':
    default:
      return [anchor.startOf('month'), anchor.endOf('month')];
  }
}

function buildBuckets(
  sales: Sale[],
  period: Period,
  anchor: Dayjs
): { key: string; label: string; cash: number; momo: number }[] {
  const [start, end] = periodRange(period, anchor);

  if (period === 'day') {
    // hourly buckets
    const buckets = Array.from({ length: 24 }, (_, i) => ({
      key: String(i),
      label: dayjs().hour(i).minute(0).format('HH:mm'),
      cash: 0,
      momo: 0,
    }));
    sales.forEach((s) => {
      const d = dayjs(s.timestamp);
      if (d.isBefore(start) || d.isAfter(end)) return;
      const b = buckets[d.hour()];
      if (s.paymentMethod === 'Cash') b.cash += s.total;
      else b.momo += s.total;
    });
    return buckets;
  }

  if (period === 'week') {
    // 7 daily buckets Mon-Sun
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = start.add(i, 'day');
      return { key: d.format('YYYY-MM-DD'), label: d.format('ddd D'), cash: 0, momo: 0 };
    });
    const map = new Map(buckets.map((b) => [b.key, b]));
    sales.forEach((s) => {
      const d = dayjs(s.timestamp);
      if (d.isBefore(start) || d.isAfter(end)) return;
      const b = map.get(d.format('YYYY-MM-DD'));
      if (!b) return;
      if (s.paymentMethod === 'Cash') b.cash += s.total;
      else b.momo += s.total;
    });
    return buckets;
  }

  // month → daily buckets
  const daysInMonth = anchor.daysInMonth();
  const buckets = Array.from({ length: daysInMonth }, (_, i) => {
    const d = anchor.startOf('month').add(i, 'day');
    return { key: d.format('YYYY-MM-DD'), label: d.format('D'), cash: 0, momo: 0 };
  });
  const map = new Map(buckets.map((b) => [b.key, b]));
  sales.forEach((s) => {
    const d = dayjs(s.timestamp);
    if (d.isBefore(start) || d.isAfter(end)) return;
    const b = map.get(d.format('YYYY-MM-DD'));
    if (!b) return;
    if (s.paymentMethod === 'Cash') b.cash += s.total;
    else b.momo += s.total;
  });
  return buckets;
}

export default function ReportsPage() {
  const { completedSales } = useSales();
  const { user } = useAuth();
  const isAdmin = Boolean(user && isAdminRole(user.role));

  const [period, setPeriod] = useState<Period>('day');
  const [anchor, setAnchor] = useState<Dayjs>(dayjs());
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string | null>(null);

  const [start, end] = periodRange(period, anchor);

  const salespersonOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const sale of completedSales) {
      const key = sale.servedBy || sale.servedByName;
      if (!key) continue;
      map.set(key, sale.servedByName || sale.servedBy || key);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [completedSales]);

  const periodSales = useMemo(
    () =>
      completedSales
        .filter((s) => {
          const d = dayjs(s.timestamp);
          if (d.isBefore(start) || d.isAfter(end)) return false;
          // Admin-only UI filter — API already scopes non-admins to their own sales.
          if (isAdmin && salespersonFilter) {
            return (
              s.servedBy === salespersonFilter ||
              s.servedByName === salespersonFilter
            );
          }
          return true;
        })
        .sort(
          (a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()
        ),
    [completedSales, start, end, isAdmin, salespersonFilter]
  );

  const cashSales = useMemo(
    () => periodSales.filter((s) => s.paymentMethod === 'Cash'),
    [periodSales]
  );
  const momoSales = useMemo(
    () => periodSales.filter((s) => s.paymentMethod === 'Mobile Money'),
    [periodSales]
  );

  const cashTotal = cashSales.reduce((s, x) => s + x.total, 0);
  const momoTotal = momoSales.reduce((s, x) => s + x.total, 0);
  const grandTotal = cashTotal + momoTotal;
  const txCount = periodSales.length;

  const buckets = useMemo(
    () => buildBuckets(periodSales, period, anchor),
    [periodSales, period, anchor]
  );

  const filteredTable = useMemo(() => {
    if (methodFilter === 'all') return periodSales;
    return periodSales.filter((s) => s.paymentMethod === methodFilter);
  }, [periodSales, methodFilter]);

  const periodLabel = useMemo(() => {
    if (period === 'day') return anchor.format('dddd, MMM D, YYYY');
    if (period === 'week')
      return `${start.format('MMM D')} – ${end.format('MMM D, YYYY')}`;
    return anchor.format('MMMM YYYY');
  }, [period, anchor, start, end]);

  const shiftAnchor = (dir: -1 | 1) => {
    if (period === 'day') setAnchor(anchor.add(dir, 'day'));
    else if (period === 'week') setAnchor(anchor.add(dir, 'week'));
    else setAnchor(anchor.add(dir, 'month'));
  };

  const handleExport = () => {
    const header = [
      'Receipt',
      'Date',
      'Time',
      'Customer',
      ...(isAdmin ? ['Served by'] : []),
      'Payment method',
      'Items',
      'Subtotal',
      'Discount',
      'Total',
    ];
    const rows = filteredTable.map((s) => [
      s.id,
      s.date,
      s.time,
      s.customer,
      ...(isAdmin ? [s.servedByName || ''] : []),
      s.paymentMethod,
      s.items.reduce((n, it) => n + it.quantity, 0),
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${period}-${anchor.format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: TableProps<Sale>['columns'] = [
    {
      title: 'Receipt',
      dataIndex: 'id',
      key: 'id',
      width: 160,
      render: (id: string) => <Text className="font-mono text-[12px]">{id}</Text>,
    },
    {
      title: 'Date / Time',
      key: 'datetime',
      width: 160,
      render: (_, r) => (
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-slate-800">
            {dayjs(r.timestamp).format('MMM D, YYYY')}
          </div>
          <div className="text-[11px] text-slate-500">{r.time}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      render: (v: string) => (
        <span className="text-[13px] text-slate-700">{v || 'Walk-in'}</span>
      ),
    },
    ...(isAdmin
      ? [
          {
            title: 'Served by',
            dataIndex: 'servedByName',
            key: 'servedByName',
            width: 140,
            render: (name: string | undefined) => (
              <span className="text-[13px] text-slate-600">{name || '—'}</span>
            ),
          } satisfies NonNullable<TableProps<Sale>['columns']>[number],
        ]
      : []),
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 160,
      render: (m: SalePaymentMethod) =>
        m === 'Cash' ? (
          <Tag
            icon={<WalletOutlined />}
            color="blue"
            className="!rounded-full !border-[#25395c]/25 !bg-[#25395c]/10 !text-[#25395c]"
          >
            Cash
          </Tag>
        ) : (
          <Tag
            icon={<MobileOutlined />}
            color="gold"
            className="!rounded-full !border-amber-200 !bg-amber-50 !text-amber-700"
          >
            Mobile Money
          </Tag>
        ),
    },
    {
      title: 'Items',
      key: 'items',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <span className="text-[13px] text-slate-600">
          {r.items.reduce((n, it) => n + it.quantity, 0)}
        </span>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 140,
      align: 'right',
      render: (v: number) => (
        <span className="text-[14px] font-bold text-[#25395c] tabular-nums">
          {currency(v)}
        </span>
      ),
      sorter: (a, b) => a.total - b.total,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              {isAdmin ? 'All sales' : 'My sales'}
            </Title>
            <Text type="secondary" className="block text-sm">
              {isAdmin
                ? 'Company-wide Cash and Mobile Money sales for any day, week, or month.'
                : 'Your Cash and Mobile Money sales for any day, week, or month.'}
            </Text>
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={filteredTable.length === 0}
            className="!bg-[#25395c] hover:!bg-[#1a2842]"
          >
            Export CSV
          </Button>
        </div>

        {/* Period toolbar */}
        <Card className="shadow-sm" styles={{ body: { padding: '0.9rem 1rem' } }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Segmented<Period>
              value={period}
              onChange={(v) => setPeriod(v)}
              options={[
                { label: 'Day', value: 'day' },
                { label: 'Week', value: 'week' },
                { label: 'Month', value: 'month' },
              ]}
              className="!bg-slate-100"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => shiftAnchor(-1)}>←</Button>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[13px] font-semibold text-slate-700 min-w-[220px]">
                {periodLabel}
              </div>
              <Button onClick={() => shiftAnchor(1)}>→</Button>

              {period === 'day' && (
                <DatePicker
                  value={anchor}
                  onChange={(v) => v && setAnchor(v)}
                  allowClear={false}
                />
              )}
              {period === 'week' && (
                <DatePicker
                  picker="week"
                  value={anchor}
                  onChange={(v) => v && setAnchor(v)}
                  allowClear={false}
                />
              )}
              {period === 'month' && (
                <DatePicker
                  picker="month"
                  value={anchor}
                  onChange={(v) => v && setAnchor(v)}
                  allowClear={false}
                />
              )}

              <Button
                onClick={() => setAnchor(dayjs())}
                type="text"
                className="!text-[#25395c]"
              >
                Today
              </Button>
            </div>
          </div>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label={isAdmin ? 'Total sales' : 'My total'}
            value={currency(grandTotal)}
            icon={<ShoppingOutlined />}
            iconBg="bg-slate-100"
            iconColor="text-slate-600"
            sub={`${txCount} transaction${txCount !== 1 ? 's' : ''}`}
          />
          <SummaryCard
            label="Cash"
            value={currency(cashTotal)}
            icon={<WalletOutlined />}
            iconBg="bg-[#25395c]/15"
            iconColor="text-[#25395c]"
            sub={`${cashSales.length} sale${cashSales.length !== 1 ? 's' : ''}`}
            accent="text-[#25395c]"
            share={grandTotal > 0 ? (cashTotal / grandTotal) * 100 : 0}
            shareColor={CASH_COLOR}
          />
          <SummaryCard
            label="Mobile Money"
            value={currency(momoTotal)}
            icon={<MobileOutlined />}
            iconBg="bg-amber-100"
            iconColor="text-amber-700"
            sub={`${momoSales.length} sale${momoSales.length !== 1 ? 's' : ''}`}
            accent="text-amber-700"
            share={grandTotal > 0 ? (momoTotal / grandTotal) * 100 : 0}
            shareColor={MOMO_COLOR}
          />
          <SummaryCard
            label="Avg. transaction"
            value={currency(txCount > 0 ? grandTotal / txCount : 0)}
            icon={<AppstoreOutlined />}
            iconBg="bg-[#25395c]/15"
            iconColor="text-[#25395c]"
            sub={
              period === 'day'
                ? 'Today'
                : period === 'week'
                ? 'This week'
                : 'This month'
            }
          />
        </div>

        {/* Chart */}
        <Card className="shadow-sm" styles={{ body: { padding: '1.25rem' } }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Sales breakdown —{' '}
              <span className="text-slate-500 font-medium">
                {period === 'day'
                  ? 'by hour'
                  : period === 'week'
                  ? 'by day'
                  : 'by day of month'}
              </span>
            </h3>
          </div>
          {grandTotal === 0 ? (
            <div className="flex h-[280px] items-center justify-center">
              <Empty
                description={isAdmin ? 'No sales in this period' : 'No sales yet'}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={buckets}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    currency(value),
                    name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Bar
                  dataKey="cash"
                  name="Cash"
                  stackId="a"
                  fill={CASH_COLOR}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="momo"
                  name="Mobile Money"
                  stackId="a"
                  fill={MOMO_COLOR}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Transactions table */}
        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Transactions
              <span className="ml-2 text-[12px] font-medium text-slate-500">
                {filteredTable.length} shown
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <Select
                  allowClear
                  placeholder="Filter by salesperson"
                  value={salespersonFilter ?? undefined}
                  onChange={(v) => setSalespersonFilter(v ?? null)}
                  size="small"
                  className="min-w-[180px]"
                  options={salespersonOptions}
                  optionFilterProp="label"
                  showSearch
                />
              ) : null}
              <Segmented<MethodFilter>
                value={methodFilter}
                onChange={(v) => setMethodFilter(v)}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Mobile Money', value: 'Mobile Money' },
                ]}
                size="small"
              />
            </div>
          </div>
          <div className="p-3">
            <Table<Sale>
              columns={columns}
              dataSource={filteredTable}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              size="middle"
              scroll={{ x: isAdmin ? 860 : 720 }}
              locale={{
                emptyText: (
                  <Empty
                    description={isAdmin ? 'No transactions' : 'No sales yet'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  iconColor,
  accent,
  share,
  shareColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  accent?: string;
  share?: number;
  shareColor?: string;
}) {
  return (
    <Card className="shadow-sm" styles={{ body: { padding: '1.1rem 1.15rem' } }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Text
            type="secondary"
            className="block text-[10.5px] font-semibold uppercase tracking-wider"
          >
            {label}
          </Text>
          <p
            className={`mt-1 mb-0 truncate text-[20px] font-bold leading-tight ${
              accent ?? 'text-slate-800'
            }`}
          >
            {value}
          </p>
          {sub && (
            <div className="mt-1 text-[11.5px] text-slate-500">{sub}</div>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}
        >
          <span className="text-lg">{icon}</span>
        </div>
      </div>
      {typeof share === 'number' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(0, Math.min(100, share))}%`,
                backgroundColor: shareColor ?? '#1a2842',
              }}
            />
          </div>
          <div className="mt-1 text-right text-[10.5px] font-semibold text-slate-500">
            {share.toFixed(0)}% of total
          </div>
        </div>
      )}
    </Card>
  );
}
