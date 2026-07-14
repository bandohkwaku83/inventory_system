'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Card,
  Typography,
  Table,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Timeline,
  Button,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined, DownloadOutlined, HistoryOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  fetchAuditLogs,
  fetchAuditLogsMeta,
  formatAuditAction,
  formatAuditDate,
  formatAuditPerson,
  relativeAuditTime,
  type AuditLogEntry,
  type AuditLogsMeta,
} from '../../lib/auditLogsApi';

const { Title, Text } = Typography;

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  approve: 'cyan',
  reject: 'orange',
  login: 'default',
  export: 'purple',
  transfer: 'geekblue',
  submit: 'blue',
  issue: 'orange',
  receive: 'green',
};

function actionColor(action: string): string {
  return ACTION_COLORS[action] ?? 'default';
}

export default function ActivityPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AuditLogsMeta | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    void fetchAuditLogsMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs({
        page,
        limit,
        action: actionFilter === 'all' ? undefined : actionFilter,
        entityType: entityFilter === 'all' ? undefined : entityFilter,
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load audit log';
      setError(msg);
      setItems([]);
      setTotal(0);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayCount = useMemo(() => {
    const now = new Date();
    return items.filter((a) => {
      const d = new Date(a.createdAt);
      return d.toDateString() === now.toDateString();
    }).length;
  }, [items]);

  const uniqueUsers = useMemo(
    () => new Set(items.map((a) => a.user?.id || a.user?.email || '').filter(Boolean)).size,
    [items]
  );

  const actionOptions = useMemo(() => {
    const actions = meta?.actions?.length
      ? meta.actions
      : Array.from(new Set(items.map((i) => i.action).filter(Boolean)));
    return [
      { value: 'all', label: 'All actions' },
      ...actions.map((a) => ({ value: a, label: formatAuditAction(a) })),
    ];
  }, [meta, items]);

  const entityOptions = useMemo(() => {
    const types = meta?.entityTypes?.length
      ? meta.entityTypes
      : Array.from(new Set(items.map((i) => i.entityType).filter(Boolean)));
    return [
      { value: 'all', label: 'All entities' },
      ...types.map((t) => ({
        value: t,
        label: t
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      })),
    ];
  }, [meta, items]);

  const columns: TableProps<AuditLogEntry>['columns'] = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (v: string) => (
        <div>
          <p className="text-xs font-medium text-slate-700">{relativeAuditTime(v)}</p>
          <p className="text-[10px] text-slate-400">{formatAuditDate(v)}</p>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (a: string) => <Tag color={actionColor(a)}>{formatAuditAction(a)}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v: string, r) => (
        <div>
          <p className="text-sm text-slate-800">{v || '—'}</p>
          <p className="font-mono text-[10px] text-slate-400">
            {r.entityType || '—'}
            {r.entityId ? ` · ${r.entityId}` : ''}
          </p>
        </div>
      ),
    },
    {
      title: 'User',
      key: 'user',
      width: 180,
      render: (_, r) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">
            {formatAuditPerson(r.user)}
          </p>
          {r.user?.email ? (
            <p className="text-[10px] text-slate-400">{r.user.email}</p>
          ) : null}
        </div>
      ),
    },
  ];

  const exportCsv = () => {
    const header = 'Timestamp,Action,Entity,Entity ID,Description,User,Email\n';
    const rows = items
      .map(
        (a) =>
          `"${a.createdAt}",${a.action},${a.entityType},${a.entityId},"${(a.description || '').replace(/"/g, '""')}",${a.user?.name ?? ''},${a.user?.email ?? ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1">
              Audit Log
            </Title>
            <Text type="secondary">
              Audit trail — who did what, when, and on which entity
            </Text>
          </div>
          <div className="flex gap-2">
            <Button
              icon={<HistoryOutlined />}
              type={view === 'timeline' ? 'primary' : 'default'}
              onClick={() => setView(view === 'table' ? 'timeline' : 'table')}
            >
              {view === 'table' ? 'Timeline' : 'Table'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={exportCsv} disabled={!items.length}>
              Export
            </Button>
          </div>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            message="Could not load audit log"
            description={error}
            action={
              <Button size="small" onClick={() => void load()}>
                Retry
              </Button>
            }
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Events today (page)" value={todayCount} />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Total logged" value={total} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Users (page)" value={uniqueUsers} />
            </Card>
          </Col>
        </Row>

        <Card className="!rounded-xl">
          <div className="table-toolbar mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search audit log…"
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
              value={actionFilter}
              onChange={(v) => {
                setActionFilter(v);
                setPage(1);
              }}
              className="min-w-[140px]"
              options={actionOptions}
            />
            <Select
              value={entityFilter}
              onChange={(v) => {
                setEntityFilter(v);
                setPage(1);
              }}
              className="min-w-[160px]"
              options={entityOptions}
            />
          </div>

          {view === 'table' ? (
            <Table<AuditLogEntry>
              columns={columns}
              dataSource={items}
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                pageSize: limit,
                total,
                showSizeChanger: false,
                showTotal: (t) => `${t} events`,
                onChange: (p) => setPage(p),
              }}
              scroll={{ x: 800 }}
            />
          ) : (
            <Timeline
              className="px-2 pt-2"
              items={items.map((a) => ({
                color: actionColor(a.action) === 'default' ? 'gray' : actionColor(a.action),
                content: (
                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={actionColor(a.action)}>{formatAuditAction(a.action)}</Tag>
                      <span className="text-[11px] text-slate-400">
                        {relativeAuditTime(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-800">{a.description || '—'}</p>
                    <p className="text-xs text-slate-500">
                      {formatAuditPerson(a.user)}
                      {a.entityType ? ` · ${a.entityType}` : ''}
                    </p>
                  </div>
                ),
              }))}
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
