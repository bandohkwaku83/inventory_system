'use client';

import React, { useMemo, useState } from 'react';
import {
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
} from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined, DownloadOutlined, HistoryOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  ACTIVITY_LOG,
  locationName,
  relativeTime,
  type ActivityEntry,
  type ActivityAction,
} from '../../lib/enterpriseDummyData';

const { Title, Text } = Typography;

const ACTION_COLORS: Record<ActivityAction, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  approve: 'cyan',
  reject: 'orange',
  login: 'default',
  export: 'purple',
  transfer: 'geekblue',
};

const ACTION_LABELS: Record<ActivityAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  approve: 'Approved',
  reject: 'Rejected',
  login: 'Login',
  export: 'Exported',
  transfer: 'Transferred',
};

export default function ActivityPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActivityAction | 'all'>('all');
  const [view, setView] = useState<'table' | 'timeline'>('table');

  const filtered = useMemo(() => {
    let list = ACTIVITY_LOG;
    if (actionFilter !== 'all') list = list.filter((a) => a.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.user.toLowerCase().includes(q) ||
          a.entity.toLowerCase().includes(q) ||
          a.entityId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, actionFilter]);

  const todayCount = ACTIVITY_LOG.filter((a) => {
    const d = new Date(a.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const columns: TableProps<ActivityEntry>['columns'] = [
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 140,
      render: (v: string) => (
        <div>
          <p className="text-xs font-medium text-slate-700">
            {relativeTime(v)}
          </p>
          <p className="text-[10px] text-slate-400">
            {new Date(v).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (a: ActivityAction) => (
        <Tag color={ACTION_COLORS[a]}>{ACTION_LABELS[a]}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v: string, r) => (
        <div>
          <p className="text-sm text-slate-800">{v}</p>
          <p className="font-mono text-[10px] text-slate-400">
            {r.entity} · {r.entityId}
          </p>
        </div>
      ),
    },
    {
      title: 'User',
      key: 'user',
      width: 160,
      render: (_, r) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">{r.user}</p>
          <p className="text-[10px] text-slate-400">{r.userRole}</p>
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 130,
      render: (_, r) =>
        r.locationId ? (
          <span className="text-xs text-slate-600">{locationName(r.locationId)}</span>
        ) : (
          '—'
        ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 110,
      render: (v?: string) => (
        <span className="font-mono text-[10px] text-slate-400">{v ?? '—'}</span>
      ),
    },
  ];

  const exportCsv = () => {
    const header = 'Timestamp,Action,Entity,Entity ID,Description,User,Role,Location,IP\n';
    const rows = filtered
      .map(
        (a) =>
          `"${a.timestamp}",${a.action},${a.entity},${a.entityId},"${a.description}",${a.user},${a.userRole},${a.locationId ?? ''},${a.ip ?? ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activity-log.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1">
              Activity Log
            </Title>
            <Text type="secondary">
              Audit trail — who did what, when, and from where
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
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
              Export
            </Button>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Events today" value={todayCount} />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Total logged" value={ACTIVITY_LOG.length} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic
                title="Unique users"
                value={new Set(ACTIVITY_LOG.map((a) => a.user)).size}
              />
            </Card>
          </Col>
        </Row>

        <Card className="!rounded-xl">
          <div className="table-toolbar mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search activity…"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              allowClear
            />
            <Select
              value={actionFilter}
              onChange={setActionFilter}
              className="min-w-[140px]"
              options={[
                { value: 'all', label: 'All actions' },
                ...Object.entries(ACTION_LABELS).map(([v, l]) => ({
                  value: v,
                  label: l,
                })),
              ]}
            />
          </div>

          {view === 'table' ? (
            <Table<ActivityEntry>
              columns={columns}
              dataSource={filtered}
              rowKey="id"
              pagination={{ pageSize: 15, showTotal: (t) => `${t} events` }}
              scroll={{ x: 800 }}
            />
          ) : (
            <Timeline
              className="px-2 pt-2"
              items={filtered.map((a) => ({
                color: ACTION_COLORS[a.action] === 'default' ? 'gray' : ACTION_COLORS[a.action],
                children: (
                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={ACTION_COLORS[a.action]}>{ACTION_LABELS[a.action]}</Tag>
                      <span className="text-[11px] text-slate-400">{relativeTime(a.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-800">{a.description}</p>
                    <p className="text-xs text-slate-500">
                      {a.user} · {a.userRole}
                      {a.locationId ? ` · ${locationName(a.locationId)}` : ''}
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
