'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Modal,
  Space,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  CheckOutlined,
  CloseOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  APPROVAL_REQUESTS,
  APPROVAL_TYPE_LABELS,
  locationName,
  formatEnterpriseCurrency,
  type ApprovalRequest,
  type ApprovalStatus,
  type ApprovalType,
} from '../../lib/enterpriseDummyData';

const { Title, Text, Paragraph } = Typography;

const PRIORITY_COLORS = { high: 'red', medium: 'orange', low: 'default' } as const;

export default function ApprovalsPage() {
  const [requests, setRequests] = useState(APPROVAL_REQUESTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<ApprovalType | 'all'>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<ApprovalRequest | null>(null);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter((r) => r.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, search, statusFilter, typeFilter]);

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const pendingValue = requests
    .filter((r) => r.status === 'pending' && r.amount > 0)
    .reduce((s, r) => s + r.amount, 0);

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r))
    );
    message.success(`Request ${action}`);
    setDetailOpen(false);
  };

  const columns: TableProps<ApprovalRequest>['columns'] = [
    {
      title: 'Request',
      key: 'title',
      render: (_, r) => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{r.title}</p>
          <p className="line-clamp-1 text-xs text-slate-500">{r.description}</p>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (t: ApprovalType) => <Tag>{APPROVAL_TYPE_LABELS[t]}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 120,
      render: (v: number) => (v > 0 ? formatEnterpriseCurrency(v) : '—'),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (p: ApprovalRequest['priority']) => (
        <Tag color={PRIORITY_COLORS[p]}>{p}</Tag>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      width: 140,
      render: (_, r) => (
        <span className="text-xs text-slate-600">{locationName(r.locationId)}</span>
      ),
    },
    {
      title: 'Requested by',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: ApprovalStatus) => (
        <Tag
          color={s === 'pending' ? 'processing' : s === 'approved' ? 'success' : 'error'}
        >
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_, r) =>
        r.status === 'pending' ? (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleAction(r.id, 'approved')}
            >
              Approve
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleAction(r.id, 'rejected')}
            >
              Reject
            </Button>
          </Space>
        ) : (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setViewing(r);
              setDetailOpen(true);
            }}
          >
            Details
          </Button>
        ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1">
              Approvals
            </Title>
            <Text type="secondary">
              Review purchase orders, expenses, discounts, and credit requests
            </Text>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8}>
            <Card size="small" className="!rounded-xl border-amber-200 bg-amber-50/50">
              <Statistic
                title="Pending approvals"
                value={pendingCount}
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic
                title="Pending value"
                value={pendingValue}
                prefix="GHS"
                precision={0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" className="!rounded-xl">
              <Statistic
                title="Approved today"
                value={requests.filter((r) => r.status === 'approved').length}
                valueStyle={{ color: '#059669' }}
              />
            </Card>
          </Col>
        </Row>

        <Card className="!rounded-xl">
          <div className="table-toolbar mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search requests…"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              allowClear
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-[130px]"
              suffixIcon={<FilterOutlined />}
              options={[
                { value: 'all', label: 'All status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              className="min-w-[130px]"
              options={[
                { value: 'all', label: 'All types' },
                ...Object.entries(APPROVAL_TYPE_LABELS).map(([v, l]) => ({
                  value: v,
                  label: l,
                })),
              ]}
            />
          </div>
          <Table<ApprovalRequest>
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (t) => `${t} requests` }}
            scroll={{ x: 960 }}
          />
        </Card>
      </div>

      <Modal
        title="Approval details"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          viewing?.status === 'pending' ? (
            <Space>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
              <Button danger onClick={() => viewing && handleAction(viewing.id, 'rejected')}>
                Reject
              </Button>
              <Button type="primary" onClick={() => viewing && handleAction(viewing.id, 'approved')}>
                Approve
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setDetailOpen(false)}>Close</Button>
          )
        }
      >
        {viewing && (
          <div className="space-y-3 pt-2">
            <div>
              <Tag>{APPROVAL_TYPE_LABELS[viewing.type]}</Tag>
              <Tag color={PRIORITY_COLORS[viewing.priority]}>{viewing.priority} priority</Tag>
            </div>
            <Title level={5} className="!mb-0">
              {viewing.title}
            </Title>
            <Paragraph type="secondary">{viewing.description}</Paragraph>
            {viewing.amount > 0 && (
              <p className="text-lg font-bold text-slate-800">
                {formatEnterpriseCurrency(viewing.amount)}
              </p>
            )}
            <div className="text-xs text-slate-500">
              <p>Requested by {viewing.requestedBy}</p>
              <p>Location: {locationName(viewing.locationId)}</p>
              <p>
                {new Date(viewing.requestedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
