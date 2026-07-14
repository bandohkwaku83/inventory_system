'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { BRAND } from '../../lib/brand';
import {
  APPROVAL_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPE_COLORS,
  APPROVAL_TYPE_LABELS,
  fetchApprovals,
  fetchApprovalsMeta,
  fetchApprovalsSummary,
  formatApprovalAmount,
  formatApprovalDate,
  formatApprovalPerson,
  type Approval,
  type ApprovalStatus,
  type ApprovalType,
  type ApprovalsMeta,
  type ApprovalsSummary,
} from '../../lib/approvalsApi';

const { Title, Text } = Typography;

const STATUS_TABS: Array<ApprovalStatus | 'all'> = [
  'pending',
  'all',
  'approved',
  'rejected',
];

function parseTypeParam(raw: string | null): ApprovalType | '' {
  if (!raw) return '';
  if (raw in APPROVAL_TYPE_LABELS) return raw as ApprovalType;
  return '';
}

function parseStatusParam(raw: string | null): ApprovalStatus | 'all' {
  if (!raw || raw === 'all') return raw === 'all' ? 'all' : 'pending';
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected') return raw;
  return 'pending';
}

function ApprovalsInboxInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<ApprovalsMeta | null>(null);
  const [summary, setSummary] = useState<ApprovalsSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>(() =>
    parseStatusParam(searchParams.get('status'))
  );
  const [typeFilter, setTypeFilter] = useState<ApprovalType | ''>(() =>
    parseTypeParam(searchParams.get('type'))
  );
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const [urlHydrated, setUrlHydrated] = useState(false);

  useEffect(() => {
    setTypeFilter(parseTypeParam(searchParams.get('type')));
    const status = searchParams.get('status');
    if (status) setStatusFilter(parseStatusParam(status));
    setUrlHydrated(true);
  }, [searchParams]);

  useEffect(() => {
    if (!urlHydrated) return;
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter && statusFilter !== 'pending') params.set('status', statusFilter);
    const qs = params.toString();
    const next = qs ? `/dashboard/approvals?${qs}` : '/dashboard/approvals';
    router.replace(next, { scroll: false });
  }, [typeFilter, statusFilter, router, urlHydrated]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchApprovalsSummary());
    } catch {
      setSummary(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApprovals({
        page,
        limit,
        status: statusFilter === 'all' ? '' : statusFilter,
        type: typeFilter || undefined,
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load approvals');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, search]);

  useEffect(() => {
    void fetchApprovalsMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void load();
  }, [load]);

  const typeOptions = (meta?.types ?? Object.keys(APPROVAL_TYPE_LABELS) as ApprovalType[]).map(
    (t) => ({ value: t, label: APPROVAL_TYPE_LABELS[t] ?? t })
  );

  const summaryValue = (key: ApprovalStatus) =>
    summary?.byStatus?.[key] ?? summary?.[key] ?? 0;

  const columns: TableProps<Approval>['columns'] = [
    {
      title: 'Number',
      dataIndex: 'approvalNumber',
      width: 110,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/approvals/${r.id}`)}
        >
          {v || '—'}
        </button>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 150,
      render: (t: ApprovalType) => (
        <Tag color={APPROVAL_TYPE_COLORS[t]}>{APPROVAL_TYPE_LABELS[t] ?? t}</Tag>
      ),
    },
    {
      title: 'Title',
      key: 'title',
      ellipsis: true,
      render: (_, r) => (
        <div>
          <p className="mb-0 text-sm font-medium text-slate-800">{r.title || '—'}</p>
          {r.description ? (
            <p className="mb-0 line-clamp-1 text-xs text-slate-500">{r.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (v: number | null) => formatApprovalAmount(v),
    },
    {
      title: 'Requested by',
      key: 'requestedBy',
      width: 150,
      render: (_, r) => formatApprovalPerson(r.requestedBy),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: ApprovalStatus) => (
        <Tag color={APPROVAL_STATUS_COLORS[s]}>{APPROVAL_STATUS_LABELS[s]}</Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 160,
      render: (v: string) => formatApprovalDate(v),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Title level={3} className="!mb-1">
            Approvals
          </Title>
          <Text type="secondary">
            Review requests from across the app — decide pending items here
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => router.push('/dashboard/approvals/new')}
        >
          New request
        </Button>
      </div>

      <Row gutter={[12, 12]}>
        {(
          [
            { key: 'pending' as const, label: 'Pending', color: '#d97706', tint: true },
            { key: 'approved' as const, label: 'Approved', color: '#059669', tint: false },
            { key: 'rejected' as const, label: 'Rejected', color: '#dc2626', tint: false },
          ] as const
        ).map((card) => {
          const active = statusFilter === card.key;
          return (
            <Col xs={8} key={card.key}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  setStatusFilter(card.key);
                  setPage(1);
                }}
              >
                <Card
                  size="small"
                  className={`!rounded-xl transition-shadow ${
                    card.tint ? '!border-amber-200 !bg-amber-50/50' : ''
                  } ${active ? 'ring-2 ring-offset-1' : 'hover:shadow-sm'}`}
                  style={active ? { ['--tw-ring-color' as string]: BRAND } : undefined}
                >
                  <Statistic
                    title={card.label}
                    value={summaryValue(card.key)}
                    styles={{ content: { color: card.color, fontSize: 22 } }}
                  />
                </Card>
              </button>
            </Col>
          );
        })}
      </Row>

      <Card className="!rounded-xl">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((s) => {
            const active = statusFilter === s;
            const label = s === 'all' ? 'All' : APPROVAL_STATUS_LABELS[s];
            const count = s === 'all' ? summary?.total : summaryValue(s);
            return (
              <Button
                key={s}
                type={active ? 'primary' : 'default'}
                size="small"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {label}
                {typeof count === 'number' ? ` (${count})` : ''}
              </Button>
            );
          })}
        </div>

        <div className="table-toolbar mb-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search number, title…"
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={() => {
              setSearch(searchInput);
              setPage(1);
            }}
            onBlur={() => {
              if (searchInput !== search) {
                setSearch(searchInput);
                setPage(1);
              }
            }}
            className="max-w-xs"
            allowClear
            onClear={() => {
              setSearchInput('');
              setSearch('');
              setPage(1);
            }}
          />
          <Select
            allowClear
            placeholder="All types"
            value={typeFilter || undefined}
            onChange={(v) => {
              setTypeFilter((v as ApprovalType) || '');
              setPage(1);
            }}
            className="min-w-[180px]"
            options={typeOptions}
          />
        </div>

        <Table<Approval>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          onRow={(r) => ({
            onClick: () => router.push(`/dashboard/approvals/${r.id}`),
            className: `cursor-pointer ${
              r.status === 'pending' ? 'border-l-[3px] border-l-amber-400' : ''
            }`,
          })}
          pagination={{
            current: page,
            pageSize: limit,
            total,
            showSizeChanger: false,
            showTotal: (t) => `${t} request${t === 1 ? '' : 's'}`,
            onChange: (p) => setPage(p),
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
}

export default function ApprovalsInboxPage() {
  return (
    <DashboardLayout>
      <React.Suspense fallback={<Card loading />}>
        <ApprovalsInboxInner />
      </React.Suspense>
    </DashboardLayout>
  );
}
