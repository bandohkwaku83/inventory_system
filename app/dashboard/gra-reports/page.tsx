'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  DatePicker,
  Space,
  Statistic,
  Row,
  Col,
  message,
  Spin,
  Alert,
} from 'antd';
import type { TableProps } from 'antd';
import { DownloadOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons';
import { startOfMonth, endOfMonth } from 'date-fns';
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
  type GraSaleRow,
} from '../../lib/graReportsApi';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface GraRow {
  key: string;
  date: string;
  time: string;
  receiptId: string;
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

function mapSaleToRow(sale: GraSaleRow): GraRow {
  const tax = sale.taxBreakdown;
  const totalTax = tax.nhil + tax.getfund + tax.covid + tax.vat;
  return {
    key: sale._id,
    date: sale.date,
    time: sale.time,
    receiptId: sale.receiptId,
    paymentMethod: sale.paymentMethod,
    taxableValue: tax.taxableValue,
    nhil: tax.nhil,
    getfund: tax.getfund,
    covidLevy: tax.covid,
    vat: tax.vat,
    totalTax,
    discount: sale.discount,
    grossTotal: sale.total,
  };
}

export default function GraReportsPage() {
  const { businessInfo, roles } = useSettings();
  const { user } = useAuth();
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs(startOfMonth(new Date())),
    dayjs(endOfMonth(new Date())),
  ]);
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

  const rows: GraRow[] = useMemo(
    () => (report?.sales ?? []).map(mapSaleToRow),
    [report]
  );

  const summary = report?.summary;

  const exportExcel = () => {
    if (!summary || rows.length === 0) {
      message.error('No sales in the selected period');
      return;
    }
    const header = [
      'Date',
      'Time',
      'Receipt ID',
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
      r.date,
      r.time,
      r.receiptId,
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
      summary.taxableValue.toFixed(2),
      summary.nhil.toFixed(2),
      summary.getfund.toFixed(2),
      summary.covid.toFixed(2),
      summary.vat.toFixed(2),
      (summary.nhil + summary.getfund + summary.covid + summary.vat).toFixed(2),
      summary.totalDiscount.toFixed(2),
      summary.grossSales.toFixed(2),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([
      [`GRA Tax Report — ${businessInfo.name}`],
      [`Period: ${range[0].format('YYYY-MM-DD')} to ${range[1].format('YYYY-MM-DD')}`],
      [`Transactions: ${summary.transactionCount}`],
      [],
      header,
      ...data,
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GRA Report');
    XLSX.writeFile(
      wb,
      `gra-report-${range[0].format('YYYY-MM')}-${dayjs().format('YYYYMMDDHHmm')}.xlsx`
    );
  };

  const columns: TableProps<GraRow>['columns'] = [
    {
      title: 'Date',
      key: 'datetime',
      width: 118,
      render: (_: unknown, r: GraRow) => (
        <div className="whitespace-nowrap leading-tight">
          <div className="font-medium text-slate-800">{r.date}</div>
          <div className="text-[11px] text-slate-400">{r.time}</div>
        </div>
      ),
    },
    {
      title: 'Receipt',
      dataIndex: 'receiptId',
      key: 'receiptId',
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
    },
    {
      title: 'Taxable',
      dataIndex: 'taxableValue',
      key: 'taxableValue',
      align: 'right',
      render: (v: number) => formatGhs(v),
    },
    {
      title: 'NHIL',
      dataIndex: 'nhil',
      key: 'nhil',
      align: 'right',
      render: (v: number) => formatGhs(v),
    },
    {
      title: 'GETFund',
      dataIndex: 'getfund',
      key: 'getfund',
      align: 'right',
      render: (v: number) => formatGhs(v),
    },
    {
      title: 'COVID',
      dataIndex: 'covidLevy',
      key: 'covidLevy',
      align: 'right',
      render: (v: number) => formatGhs(v),
    },
    {
      title: 'VAT',
      dataIndex: 'vat',
      key: 'vat',
      align: 'right',
      render: (v: number) => formatGhs(v),
    },
    {
      title: 'Total Tax',
      dataIndex: 'totalTax',
      key: 'totalTax',
      align: 'right',
      render: (v: number) => <span className="font-semibold">{formatGhs(v)}</span>,
    },
    {
      title: 'Gross',
      dataIndex: 'grossTotal',
      key: 'grossTotal',
      align: 'right',
      render: (v: number) => formatGhs(v),
    },
  ];

  if (user && !canAccess) {
    return (
      <DashboardLayout>
        <Card>
          <Text type="danger">You do not have permission to view GRA reports.</Text>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              GRA Tax Reports
            </Title>
            <Text type="secondary">
              VAT, NHIL, GETFund & COVID levy breakdown for Ghana Revenue Authority filing.
            </Text>
            <div className="mt-2 text-xs text-slate-500">Business: {businessInfo.name}</div>
          </div>
          <Space wrap>
            <RangePicker
              value={range}
              onChange={(v) => {
                if (v?.[0] && v?.[1]) setRange([v[0], v[1]]);
              }}
              allowClear={false}
            />
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
            >
              Export Excel
            </Button>
          </Space>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="Could not load GRA report"
            description={error}
            action={
              <Button
                size="small"
                onClick={() =>
                  void loadReport(range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'))
                }
              >
                Retry
              </Button>
            }
          />
        ) : null}

        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Sales"
                  value={summary?.transactionCount ?? 0}
                  prefix={<FileTextOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Taxable value"
                  value={summary?.taxableValue ?? 0}
                  precision={2}
                  prefix="GHS"
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic title="NHIL" value={summary?.nhil ?? 0} precision={2} prefix="GHS" />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="GETFund"
                  value={summary?.getfund ?? 0}
                  precision={2}
                  prefix="GHS"
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic title="VAT" value={summary?.vat ?? 0} precision={2} prefix="GHS" />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card size="small">
                <Statistic
                  title="Gross sales"
                  value={summary?.grossSales ?? 0}
                  precision={2}
                  prefix="GHS"
                />
              </Card>
            </Col>
          </Row>

          <Card className="mt-4 shadow-sm" styles={{ body: { padding: 0 } }}>
            <Table<GraRow>
              rowKey="key"
              columns={columns}
              dataSource={rows}
              pagination={{ pageSize: 20, showTotal: (t) => `${t} transactions` }}
              scroll={{ x: 1100 }}
              size="small"
              locale={{ emptyText: loading ? 'Loading…' : 'No sales in this period' }}
            />
          </Card>
        </Spin>
      </div>
    </DashboardLayout>
  );
}
