'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Table,
  Tag,
  message,
  Spin,
  Empty,
} from 'antd';
import type { TableProps } from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  PercentageOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import DashboardLayout from '../../components/DashboardLayout';
import { useSettings } from '../../context/SettingsContext';
import { formatGhs } from '../../lib/tax';
import { useAuth } from '../../context/AuthContext';
import { canAccessGraReports } from '../../context/UsersContext';
import {
  fetchGraReport,
  type GraReportResponse,
  type GraSaleItemRow,
  type GraSaleRow,
} from '../../lib/graReportsApi';

const { RangePicker } = DatePicker;

interface GraTaxRow {
  key: string;
  date: string;
  time: string;
  reference: string;
  detail: string;
  paymentMethod: string;
  taxableValue: number;
  nhil: number;
  getfund: number;
  covidLevy: number;
  vat: number;
  totalTax: number;
  discount: number;
  grossTotal: number;
}

type PeriodPreset = 'this-month' | 'last-month' | 'quarter' | 'custom';

function taxFromBreakdown(tax: {
  nhil: number;
  getfund: number;
  covid: number;
  vat: number;
}) {
  return tax.nhil + tax.getfund + tax.covid + tax.vat;
}

/** Display as "6 Jun 2026" */
function formatGraDate(value?: string) {
  if (!value) return '—';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  return parsed.format('D MMM YYYY');
}

function rowSortKey(row: Pick<GraTaxRow, 'date' | 'time'>) {
  const combined = [row.date, row.time].filter(Boolean).join(' ');
  const parsed = dayjs(combined);
  if (parsed.isValid()) return parsed.valueOf();
  const dateOnly = dayjs(row.date);
  return dateOnly.isValid() ? dateOnly.valueOf() : 0;
}

function mapSaleItemToRow(
  sale: GraSaleRow,
  item: GraSaleItemRow,
  itemIndex: number
): GraTaxRow {
  const tax = item.taxBreakdown;
  const saleKey = sale._id ?? sale.receiptId;
  const itemKey = item._id ?? `${item.name}-${itemIndex}`;
  return {
    key: `${saleKey}-${itemKey}`,
    date: sale.date,
    time: sale.time,
    reference: sale.receiptId,
    detail: `${item.name} × ${item.quantity}`,
    paymentMethod: sale.paymentMethod,
    taxableValue: tax.taxableValue,
    nhil: tax.nhil,
    getfund: tax.getfund,
    covidLevy: tax.covid,
    vat: tax.vat,
    totalTax: taxFromBreakdown(tax),
    discount: item.lineDiscount,
    grossTotal: item.lineTotal,
  };
}

function flattenSaleItems(sales: GraSaleRow[]): GraTaxRow[] {
  const rows: GraTaxRow[] = [];
  for (const sale of sales) {
    if (sale.items?.length) {
      sale.items.forEach((item, index) => {
        rows.push(mapSaleItemToRow(sale, item, index));
      });
      continue;
    }
    const tax = sale.taxBreakdown;
    rows.push({
      key: sale._id ?? sale.receiptId,
      date: sale.date,
      time: sale.time,
      reference: sale.receiptId,
      detail: sale.customer || 'Walk-in',
      paymentMethod: sale.paymentMethod,
      taxableValue: tax.taxableValue,
      nhil: tax.nhil,
      getfund: tax.getfund,
      covidLevy: tax.covid,
      vat: tax.vat,
      totalTax: taxFromBreakdown(tax),
      discount: sale.discount,
      grossTotal: sale.total,
    });
  }
  return rows;
}

function rangeForPreset(preset: Exclude<PeriodPreset, 'custom'>): [dayjs.Dayjs, dayjs.Dayjs] {
  const now = new Date();
  if (preset === 'this-month') {
    return [dayjs(startOfMonth(now)), dayjs(endOfMonth(now))];
  }
  if (preset === 'last-month') {
    const last = subMonths(now, 1);
    return [dayjs(startOfMonth(last)), dayjs(endOfMonth(last))];
  }
  return [dayjs(startOfQuarter(now)), dayjs(endOfQuarter(now))];
}

function detectPreset(range: [dayjs.Dayjs, dayjs.Dayjs]): PeriodPreset {
  const presets: Exclude<PeriodPreset, 'custom'>[] = ['this-month', 'last-month', 'quarter'];
  for (const p of presets) {
    const [from, to] = rangeForPreset(p);
    if (range[0].isSame(from, 'day') && range[1].isSame(to, 'day')) return p;
  }
  return 'custom';
}

function PaymentTag({ method }: { method: string }) {
  const lower = method.toLowerCase();
  if (lower.includes('cash')) {
    return (
      <Tag className="!m-0 !rounded-md !border-[#25395c]/20 !bg-[#25395c]/8 !text-[#25395c] !text-[11px] !font-medium">
        Cash
      </Tag>
    );
  }
  if (lower.includes('mobile') || lower.includes('momo')) {
    return (
      <Tag className="!m-0 !rounded-md !border-amber-200 !bg-amber-50 !text-amber-700 !text-[11px] !font-medium">
        MoMo
      </Tag>
    );
  }
  return (
    <Tag className="!m-0 !rounded-md !border-slate-200 !bg-slate-50 !text-slate-600 !text-[11px] !font-medium">
      {method || '—'}
    </Tag>
  );
}

export default function GraReportsPage() {
  const { businessInfo, roles } = useSettings();
  const { user } = useAuth();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() =>
    rangeForPreset('this-month')
  );
  const [preset, setPreset] = useState<PeriodPreset>('this-month');
  const [report, setReport] = useState<GraReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = !user || canAccessGraReports(user.role, roles, user.entitlements);

  const loadReport = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGraReport(from, to);
      setReport(data);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : 'Failed to load GRA report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    void loadReport(range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'));
  }, [canAccess, range, loadReport]);

  const rows: GraTaxRow[] = useMemo(() => {
    const flattened = flattenSaleItems(report?.sales ?? []);
    return [...flattened].sort((a, b) => rowSortKey(b) - rowSortKey(a));
  }, [report]);

  const summary = report?.summary;

  const totalTax = useMemo(() => {
    if (!summary) return 0;
    return summary.nhil + summary.getfund + summary.covid + summary.vat;
  }, [summary]);

  const applyPreset = (next: Exclude<PeriodPreset, 'custom'>) => {
    setPreset(next);
    setRange(rangeForPreset(next));
  };

  const exportExcel = () => {
    if (!summary || rows.length === 0) {
      message.error('No sales in the selected period');
      return;
    }
    const header = [
      'Date',
      'Time',
      'Receipt ID',
      'Detail',
      'Payment',
      'Taxable Value (GHS)',
      'NHIL (GHS)',
      'GETFund (GHS)',
      'COVID Levy (GHS)',
      'VAT (GHS)',
      'Total Tax (GHS)',
      'Discount (GHS)',
      'Gross Total (GHS)',
    ];
    const data = rows.map((r) => [
      formatGraDate(r.date),
      r.time,
      r.reference,
      r.detail,
      r.paymentMethod,
      r.taxableValue.toFixed(2),
      r.nhil.toFixed(2),
      r.getfund.toFixed(2),
      r.covidLevy.toFixed(2),
      r.vat.toFixed(2),
      r.totalTax.toFixed(2),
      r.discount.toFixed(2),
      r.grossTotal.toFixed(2),
    ]);
    data.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      summary.taxableValue.toFixed(2),
      summary.nhil.toFixed(2),
      summary.getfund.toFixed(2),
      summary.covid.toFixed(2),
      summary.vat.toFixed(2),
      totalTax.toFixed(2),
      summary.totalDiscount.toFixed(2),
      summary.grossSales.toFixed(2),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`GRA Tax Report — ${businessInfo.name}`],
      [`Period: ${range[0].format('D MMM YYYY')} to ${range[1].format('D MMM YYYY')}`],
      [`Line items: ${rows.length}`],
      [],
      header,
      ...data,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GRA Report');
    XLSX.writeFile(
      wb,
      `gra-sales-${range[0].format('YYYY-MM')}-${dayjs().format('YYYYMMDDHHmm')}.xlsx`
    );
  };

  const columns: TableProps<GraTaxRow>['columns'] = [
    {
      title: 'Date',
      key: 'datetime',
      width: 118,
      fixed: 'left',
      render: (_: unknown, r: GraTaxRow) => (
        <div className="whitespace-nowrap leading-tight">
          <div className="text-[13px] font-semibold text-slate-800">{formatGraDate(r.date)}</div>
          <div className="text-[11px] tabular-nums text-slate-400">{r.time}</div>
        </div>
      ),
    },
    {
      title: 'Receipt',
      dataIndex: 'reference',
      key: 'reference',
      width: 140,
      render: (v: string) => (
        <span className="font-mono text-[11px] font-medium text-slate-600">{v}</span>
      ),
    },
    {
      title: 'Item / Detail',
      dataIndex: 'detail',
      key: 'detail',
      ellipsis: true,
      render: (v: string) => <span className="text-[13px] text-slate-700">{v}</span>,
    },
    {
      title: 'Pay',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 88,
      render: (v: string) => <PaymentTag method={v} />,
    },
    {
      title: 'Taxable',
      dataIndex: 'taxableValue',
      key: 'taxableValue',
      align: 'right',
      width: 110,
      render: (v: number) => (
        <span className="tabular-nums text-[12px] text-slate-600">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'NHIL',
      dataIndex: 'nhil',
      key: 'nhil',
      align: 'right',
      width: 92,
      render: (v: number) => (
        <span className="tabular-nums text-[12px] text-sky-700">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'GETFund',
      dataIndex: 'getfund',
      key: 'getfund',
      align: 'right',
      width: 92,
      render: (v: number) => (
        <span className="tabular-nums text-[12px] text-emerald-700">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'COVID',
      dataIndex: 'covidLevy',
      key: 'covidLevy',
      align: 'right',
      width: 92,
      render: (v: number) => (
        <span className="tabular-nums text-[12px] text-amber-700">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'VAT',
      dataIndex: 'vat',
      key: 'vat',
      align: 'right',
      width: 92,
      render: (v: number) => (
        <span className="tabular-nums text-[12px] text-slate-700">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'Total Tax',
      dataIndex: 'totalTax',
      key: 'totalTax',
      align: 'right',
      width: 110,
      render: (v: number) => (
        <span className="tabular-nums text-[13px] font-bold text-[#25395c]">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'Gross',
      dataIndex: 'grossTotal',
      key: 'grossTotal',
      align: 'right',
      width: 110,
      render: (v: number) => (
        <span className="tabular-nums text-[12px] font-semibold text-slate-800">{formatGhs(v)}</span>
      ),
    },
  ];

  if (user && !canAccess) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-8 text-center">
          <p className="text-sm font-medium text-red-700">
            You do not have permission to view GRA reports.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <header className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25395c] text-white shadow-sm">
                  <BankOutlined className="text-base" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Ghana Revenue Authority
                  </p>
                  <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    Tax Reports
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                icon={<ReloadOutlined />}
                onClick={() =>
                  void loadReport(range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'))
                }
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={exportExcel}
                disabled={loading || rows.length === 0}
                className="!bg-[#25395c] hover:!bg-[#1a2842]"
              >
                Export Excel
              </Button>
            </div>
          </div>

          {/* Period toolbar */}
          <div className="flex flex-col gap-3 bg-slate-50/60 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: 'this-month', label: 'This month' },
                  { key: 'last-month', label: 'Last month' },
                  { key: 'quarter', label: 'This quarter' },
                ] as const
              ).map((p) => {
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? 'bg-[#25395c] text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              {preset === 'custom' ? (
                <span className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-500 ring-1 ring-slate-200">
                  Custom range
                </span>
              ) : null}
            </div>
            <RangePicker
              value={range}
              onChange={(v) => {
                if (v?.[0] && v?.[1]) {
                  const next: [dayjs.Dayjs, dayjs.Dayjs] = [v[0], v[1]];
                  setRange(next);
                  setPreset(detectPreset(next));
                }
              }}
              allowClear={false}
              className="w-full sm:!w-auto"
            />
          </div>
        </header>

        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-red-800">Could not load GRA report</p>
              <p className="mt-0.5 text-xs text-red-600">{error}</p>
            </div>
            <Button
              size="small"
              onClick={() =>
                void loadReport(range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'))
              }
            >
              Retry
            </Button>
          </div>
        ) : null}

        <Spin spinning={loading}>
          <div className="space-y-5">
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25395c]/10 text-[#25395c]">
                    <PercentageOutlined />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    Tax liability
                  </span>
                </div>
                <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-[#25395c] sm:text-2xl">
                  {formatGhs(totalTax)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Payable for selected period</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <BankOutlined />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    Taxable value
                  </span>
                </div>
                <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-slate-800 sm:text-2xl">
                  {formatGhs(summary?.taxableValue ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">Before levies & VAT</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileTextOutlined />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    Receipts
                  </span>
                </div>
                <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-slate-800 sm:text-2xl">
                  {summary?.transactionCount ?? 0}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {summary?.itemCount ?? 0} line item{(summary?.itemCount ?? 0) === 1 ? '' : 's'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <ShoppingOutlined />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    Gross sales
                  </span>
                </div>
                <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-slate-800 sm:text-2xl">
                  {formatGhs(summary?.grossSales ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Discount {formatGhs(summary?.totalDiscount ?? 0)}
                </p>
              </div>
            </div>

            {/* Line items table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Sale line items</h2>
                  <p className="text-xs text-slate-500">
                    Customer sales only — output tax for GRA filing
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold tabular-nums text-slate-600 ring-1 ring-slate-200">
                  {rows.length} item{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <Table<GraTaxRow>
                rowKey="key"
                columns={columns}
                dataSource={rows}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: false,
                  showTotal: (t) => `${t} line items`,
                  className: '!px-4',
                }}
                scroll={{ x: 1180 }}
                size="middle"
                className="[&_.ant-table-thead>tr>th]:!bg-slate-50 [&_.ant-table-thead>tr>th]:!text-[11px] [&_.ant-table-thead>tr>th]:!font-semibold [&_.ant-table-thead>tr>th]:!uppercase [&_.ant-table-thead>tr>th]:!tracking-wide [&_.ant-table-thead>tr>th]:!text-slate-500"
                locale={{
                  emptyText: loading ? (
                    <div className="py-10 text-slate-400">Loading…</div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No sales in this period"
                      className="!py-10"
                    />
                  ),
                }}
              />
            </div>
          </div>
        </Spin>
      </div>
    </DashboardLayout>
  );
}
