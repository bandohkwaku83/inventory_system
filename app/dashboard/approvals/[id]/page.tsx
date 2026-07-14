'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { BRAND } from '../../../lib/brand';
import {
  APPROVAL_STATUS_COLORS,
  APPROVAL_STATUS_LABELS,
  APPROVAL_TYPE_COLORS,
  APPROVAL_TYPE_LABELS,
  approveApproval,
  entityPathForApproval,
  fetchApprovalById,
  formatApprovalAmount,
  formatApprovalDate,
  formatApprovalPerson,
  rejectApproval,
  type Approval,
} from '../../../lib/approvalsApi';
import {
  TRANSFER_STATUS_COLORS,
  TRANSFER_STATUS_LABELS,
  type TransferLine,
  type WarehouseTransfer,
} from '../../../lib/transfersApi';

const { Title, Text, Paragraph } = Typography;

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const a = await fetchApprovalById(id);
      setApproval(a);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load approval');
      setApproval(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isTransfer = approval?.type === 'warehouse_transfer';
  const transfer: WarehouseTransfer | null | undefined = approval?.entity;
  const pending = approval?.status === 'pending';
  const linkedPath = approval
    ? entityPathForApproval(approval.type, approval.entityId)
    : null;

  const lineColumns: TableProps<TransferLine>['columns'] = useMemo(
    () => [
      {
        title: 'Product',
        key: 'product',
        render: (_, r) => (
          <div>
            <div className="font-medium">{r.product.name}</div>
            {r.product.sku ? (
              <Text type="secondary" className="font-mono text-xs">
                {r.product.sku}
              </Text>
            ) : null}
          </div>
        ),
      },
      { title: 'Qty', dataIndex: 'quantity', width: 80 },
      {
        title: 'From bin',
        key: 'fromLoc',
        render: (_, r) =>
          r.fromLocation
            ? `${r.fromLocation.code} — ${r.fromLocation.name}`
            : '—',
      },
      {
        title: 'To bin',
        key: 'toLoc',
        render: (_, r) =>
          r.toLocation ? `${r.toLocation.code} — ${r.toLocation.name}` : '—',
      },
    ],
    []
  );

  const applyResult = (updated: Approval, successMsg: string) => {
    setApproval(updated);
    message.success(successMsg);
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error || !approval ? (
        <Result
          status="error"
          title="Could not load approval"
          subTitle={error || 'Not found'}
          extra={
            <Button onClick={() => router.push('/dashboard/approvals')}>
              Back to inbox
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="!px-0 mb-1"
                onClick={() => router.push('/dashboard/approvals')}
              >
                Inbox
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Title level={3} className="!mb-0 font-mono">
                  {approval.approvalNumber || '—'}
                </Title>
                <Tag color={APPROVAL_TYPE_COLORS[approval.type]}>
                  {APPROVAL_TYPE_LABELS[approval.type]}
                </Tag>
                <Tag color={APPROVAL_STATUS_COLORS[approval.status]}>
                  {APPROVAL_STATUS_LABELS[approval.status]}
                </Tag>
              </div>
              <Title level={5} className="!mt-2 !mb-1">
                {approval.title}
              </Title>
              {approval.description ? (
                <Paragraph type="secondary" className="!mb-0">
                  {approval.description}
                </Paragraph>
              ) : null}
            </div>

            {pending ? (
              <Space wrap>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  loading={acting}
                  onClick={() => {
                    setReviewNotes('');
                    setApproveOpen(true);
                  }}
                >
                  Approve
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  loading={acting}
                  onClick={() => {
                    setRejectReason('');
                    setRejectOpen(true);
                  }}
                >
                  Reject
                </Button>
              </Space>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Request" size="small">
              <Descriptions column={1} size="small">
                {approval.amount !== null && approval.amount !== undefined ? (
                  <Descriptions.Item label="Amount">
                    <span className="font-semibold">
                      {formatApprovalAmount(approval.amount)}
                    </span>
                  </Descriptions.Item>
                ) : null}
                <Descriptions.Item label="Requested by">
                  {formatApprovalPerson(approval.requestedBy)}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {formatApprovalDate(approval.createdAt)}
                </Descriptions.Item>
                {approval.status !== 'pending' ? (
                  <>
                    <Descriptions.Item label="Reviewed by">
                      {formatApprovalPerson(approval.reviewedBy)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Reviewed at">
                      {formatApprovalDate(approval.reviewedAt)}
                    </Descriptions.Item>
                    {approval.reviewNotes ? (
                      <Descriptions.Item label="Review notes">
                        {approval.reviewNotes}
                      </Descriptions.Item>
                    ) : null}
                  </>
                ) : null}
              </Descriptions>
            </Card>

            <Card title="Context" size="small">
              {isTransfer && transfer ? (
                <div className="space-y-3">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Transfer">
                      <button
                        type="button"
                        className="font-mono text-sm font-semibold hover:underline"
                        style={{ color: BRAND }}
                        onClick={() =>
                          router.push(`/dashboard/warehouse-transfers/${transfer.id}`)
                        }
                      >
                        {transfer.transferNumber}
                      </button>
                    </Descriptions.Item>
                    <Descriptions.Item label="Route">
                      <span className="font-mono text-xs text-slate-500">
                        {transfer.fromWarehouse.code}
                      </span>{' '}
                      {transfer.fromWarehouse.name}
                      <span className="mx-1 text-slate-400">→</span>
                      <span className="font-mono text-xs text-slate-500">
                        {transfer.toWarehouse.code}
                      </span>{' '}
                      {transfer.toWarehouse.name}
                    </Descriptions.Item>
                    <Descriptions.Item label="Transfer status">
                      <Tag color={TRANSFER_STATUS_COLORS[transfer.status]}>
                        {TRANSFER_STATUS_LABELS[transfer.status]}
                      </Tag>
                    </Descriptions.Item>
                    {transfer.notes ? (
                      <Descriptions.Item label="Notes">
                        {transfer.notes}
                      </Descriptions.Item>
                    ) : null}
                  </Descriptions>
                  <Button
                    type="link"
                    className="!px-0"
                    onClick={() =>
                      router.push(
                        linkedPath ?? `/dashboard/warehouse-transfers/${transfer.id}`
                      )
                    }
                  >
                    Open linked document
                  </Button>
                </div>
              ) : isTransfer ? (
                <Text type="secondary">
                  Transfer context unavailable.
                  {linkedPath ? (
                    <>
                      {' '}
                      <Button
                        type="link"
                        className="!px-0"
                        onClick={() => router.push(linkedPath)}
                      >
                        Open linked document
                      </Button>
                    </>
                  ) : null}
                </Text>
              ) : (
                <div className="space-y-2">
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Title">
                      {approval.title || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Description">
                      {approval.description || '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Amount">
                      {formatApprovalAmount(approval.amount)}
                    </Descriptions.Item>
                  </Descriptions>
                  {approval.payload && Object.keys(approval.payload).length > 0 ? (
                    <pre className="max-h-40 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      {JSON.stringify(approval.payload, null, 2)}
                    </pre>
                  ) : (
                    <Text type="secondary" className="text-xs">
                      No extra payload for this request.
                    </Text>
                  )}
                  {linkedPath ? (
                    <Button type="primary" ghost onClick={() => router.push(linkedPath)}>
                      Open linked document
                    </Button>
                  ) : null}
                </div>
              )}
            </Card>
          </div>

          {isTransfer && transfer && transfer.lines.length > 0 ? (
            <Card title="Transfer lines" size="small">
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                columns={lineColumns}
                dataSource={transfer.lines}
              />
            </Card>
          ) : null}
        </div>
      )}

      <Modal
        title="Approve request"
        open={approveOpen}
        okText="Approve"
        confirmLoading={acting}
        onCancel={() => setApproveOpen(false)}
        onOk={() => {
          if (!approval) return;
          void (async () => {
            setActing(true);
            try {
              const result = await approveApproval(
                approval.id,
                reviewNotes.trim() || undefined
              );
              const next: Approval = {
                ...result.approval,
                entity:
                  result.transfer ??
                  result.approval.entity ??
                  approval.entity ??
                  null,
              };
              setApproveOpen(false);
              applyResult(
                next,
                isTransfer
                  ? 'Approved — transfer stock deducted and set to in transit'
                  : 'Request approved'
              );
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Approve failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        {isTransfer ? (
          <Alert
            type="warning"
            showIcon
            className="mb-3"
            message="This will deduct stock from the source warehouse and move the transfer to In transit."
          />
        ) : null}
        <Text type="secondary" className="mb-2 block">
          Optional review notes
        </Text>
        <Input.TextArea
          rows={3}
          value={reviewNotes}
          placeholder="e.g. Approved"
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      </Modal>

      <Modal
        title="Reject request"
        open={rejectOpen}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={acting}
        onCancel={() => setRejectOpen(false)}
        onOk={() => {
          if (!approval || !rejectReason.trim()) return;
          void (async () => {
            setActing(true);
            try {
              const result = await rejectApproval(
                approval.id,
                rejectReason.trim()
              );
              const next: Approval = {
                ...result.approval,
                entity:
                  result.transfer ??
                  result.approval.entity ??
                  approval.entity ??
                  null,
              };
              setRejectOpen(false);
              applyResult(
                next,
                isTransfer
                  ? 'Rejected — linked transfer cancelled'
                  : 'Request rejected'
              );
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Reject failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        {isTransfer ? (
          <Alert
            type="warning"
            showIcon
            className="mb-3"
            message="This will cancel the transfer request."
          />
        ) : null}
        <Text type="secondary" className="mb-2 block">
          Reason is required
        </Text>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          placeholder="Why is this request rejected?"
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </DashboardLayout>
  );
}
