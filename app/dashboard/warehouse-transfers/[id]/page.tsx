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
  Steps,
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
  EditOutlined,
  InboxOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { BRAND } from '../../../lib/brand';
import {
  approveTransfer,
  cancelTransfer,
  fetchTransferById,
  formatTransferDate,
  formatTransferPerson,
  isSameWarehouseTransfer,
  receiveTransfer,
  rejectTransfer,
  submitTransfer,
  TRANSFER_STATUS_COLORS,
  TRANSFER_STATUS_LABELS,
  TRANSFER_WORKFLOW_STEPS,
  type TransferLine,
  type TransferStatus,
  type WarehouseTransfer,
} from '../../../lib/transfersApi';

const { Title, Text } = Typography;

function workflowStepIndex(status: TransferStatus): number {
  if (status === 'cancelled') return -1;
  return TRANSFER_WORKFLOW_STEPS.indexOf(status);
}

export default function WarehouseTransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [transfer, setTransfer] = useState<WarehouseTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const t = await fetchTransferById(id);
      setTransfer(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transfer');
      setTransfer(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    action: () => Promise<WarehouseTransfer>,
    successMsg: string
  ) => {
    setActing(true);
    try {
      const updated = await action();
      setTransfer(updated);
      message.success(successMsg);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const stepIndex = transfer ? workflowStepIndex(transfer.status) : 0;
  const sameWarehouse = transfer ? isSameWarehouseTransfer(transfer) : false;

  const lineColumns: TableProps<TransferLine>['columns'] = useMemo(
    () => [
      {
        title: 'Product',
        key: 'product',
        render: (_, r) => (
          <div>
            <div className="font-medium">{r.product.name}</div>
            {r.product.sku && (
              <Text type="secondary" className="font-mono text-xs">
                {r.product.sku}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Qty',
        dataIndex: 'quantity',
        width: 80,
      },
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

  const actionBar = transfer ? (
    <Space wrap>
      {transfer.status === 'draft' && (
        <>
          <Button
            icon={<EditOutlined />}
            onClick={() =>
              router.push(`/dashboard/warehouse-transfers/${transfer.id}/edit`)
            }
          >
            Edit
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={acting}
            onClick={() =>
              void runAction(
                () => submitTransfer(transfer.id),
                'Submitted for approval'
              )
            }
          >
            Submit
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Cancel this draft?',
                content: 'The transfer will be marked cancelled and become read-only.',
                okText: 'Cancel transfer',
                okButtonProps: { danger: true },
                onOk: () =>
                  runAction(() => cancelTransfer(transfer.id), 'Transfer cancelled'),
              });
            }}
          >
            Cancel
          </Button>
        </>
      )}

      {transfer.status === 'pending_approval' && (
        <>
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
          <Button
            icon={<StopOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Cancel pending transfer?',
                content: 'This closes the request without approval.',
                okText: 'Cancel transfer',
                okButtonProps: { danger: true },
                onOk: () =>
                  runAction(() => cancelTransfer(transfer.id), 'Transfer cancelled'),
              });
            }}
          >
            Cancel
          </Button>
        </>
      )}

      {transfer.status === 'in_transit' && (
        <>
          <Button
            type="primary"
            icon={<InboxOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Receive this transfer?',
                content:
                  'Stock will be credited to the destination warehouse. This cannot be undone.',
                okText: 'Receive',
                onOk: () =>
                  runAction(
                    () => receiveTransfer(transfer.id),
                    'Transfer received — destination stock credited'
                  ),
              });
            }}
          >
            Receive
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Cancel in-transit transfer?',
                content:
                  'Source stock will be restored. Only cancel if the shipment will not complete.',
                okText: 'Cancel & restore stock',
                okButtonProps: { danger: true },
                onOk: () =>
                  runAction(
                    () => cancelTransfer(transfer.id),
                    'Transfer cancelled — source stock restored'
                  ),
              });
            }}
          >
            Cancel
          </Button>
        </>
      )}
    </Space>
  ) : null;

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error || !transfer ? (
        <Result
          status="error"
          title="Transfer not found"
          subTitle={error ?? 'Unknown error'}
          extra={
            <Button onClick={() => router.push('/dashboard/warehouse-transfers')}>
              Back to list
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="!px-0 mb-1"
                onClick={() => router.push('/dashboard/warehouse-transfers')}
              >
                Transfers
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <Title level={3} className="!mb-0 font-mono">
                  {transfer.transferNumber || 'Transfer'}
                </Title>
                <Tag color={TRANSFER_STATUS_COLORS[transfer.status]}>
                  {TRANSFER_STATUS_LABELS[transfer.status]}
                </Tag>
                {sameWarehouse && <Tag color="cyan">Internal bin move</Tag>}
              </div>
              <Text type="secondary">
                {transfer.fromWarehouse.code} {transfer.fromWarehouse.name}
                {' → '}
                {transfer.toWarehouse.code} {transfer.toWarehouse.name}
              </Text>
            </div>
            {actionBar}
          </div>

          {transfer.status === 'cancelled' ? (
            <Alert
              type="error"
              showIcon
              message="Cancelled"
              description={
                transfer.rejectionReason
                  ? `Reason: ${transfer.rejectionReason}`
                  : `Cancelled ${formatTransferDate(transfer.cancelledAt)} by ${formatTransferPerson(transfer.cancelledBy)}`
              }
            />
          ) : (
            <Card size="small">
              <Steps
                size="small"
                current={Math.max(0, stepIndex)}
                items={TRANSFER_WORKFLOW_STEPS.map((s) => ({
                  title: TRANSFER_STATUS_LABELS[s],
                }))}
              />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Summary" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="From">
                  <span className="font-mono text-xs" style={{ color: BRAND }}>
                    {transfer.fromWarehouse.code}
                  </span>{' '}
                  {transfer.fromWarehouse.name}
                </Descriptions.Item>
                <Descriptions.Item label="To">
                  <span className="font-mono text-xs" style={{ color: BRAND }}>
                    {transfer.toWarehouse.code}
                  </span>{' '}
                  {transfer.toWarehouse.name}
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {transfer.notes || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Stock">
                  Deducted: {transfer.stockDeducted ? 'yes' : 'no'}
                  {' · '}
                  Received: {transfer.stockReceived ? 'yes' : 'no'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="People & timestamps" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Requested">
                  {formatTransferPerson(transfer.requestedBy)}
                  {' · '}
                  {formatTransferDate(transfer.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Approved">
                  {formatTransferPerson(transfer.approvedBy)}
                  {' · '}
                  {formatTransferDate(transfer.approvedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Shipped">
                  {formatTransferDate(transfer.shippedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Received">
                  {formatTransferPerson(transfer.receivedBy)}
                  {' · '}
                  {formatTransferDate(transfer.receivedAt)}
                </Descriptions.Item>
                {(transfer.cancelledAt || transfer.rejectedAt) && (
                  <Descriptions.Item label="Cancelled / rejected">
                    {formatTransferPerson(transfer.cancelledBy ?? transfer.rejectedBy)}
                    {' · '}
                    {formatTransferDate(transfer.cancelledAt ?? transfer.rejectedAt)}
                    {transfer.rejectionReason
                      ? ` — ${transfer.rejectionReason}`
                      : ''}
                  </Descriptions.Item>
                )}
              </Descriptions>
              {transfer.approval && (
                <div className="mt-3">
                  <Button
                    type="link"
                    className="!px-0"
                    onClick={() =>
                      router.push(
                        transfer.approval?.id
                          ? `/dashboard/approvals/${transfer.approval.id}`
                          : '/dashboard/approvals'
                      )
                    }
                  >
                    View in Approvals ({transfer.approval.approvalNumber || 'open'})
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <Card title="Lines" size="small">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={lineColumns}
              dataSource={transfer.lines}
            />
          </Card>
        </div>
      )}

      <Modal
        title="Approve & ship"
        open={approveOpen}
        okText="Approve"
        confirmLoading={acting}
        onCancel={() => setApproveOpen(false)}
        onOk={() => {
          if (!transfer) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await approveTransfer(
                transfer.id,
                reviewNotes.trim() || undefined
              );
              setTransfer(updated);
              setApproveOpen(false);
              message.success('Approved — stock deducted at source, now in transit');
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Approve failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          message="Approving deducts stock from the source warehouse and sets status to In transit."
        />
        <Text type="secondary" className="mb-2 block">
          Optional review notes
        </Text>
        <Input.TextArea
          rows={3}
          value={reviewNotes}
          placeholder="e.g. OK to ship"
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      </Modal>

      <Modal
        title="Reject transfer"
        open={rejectOpen}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={acting}
        onCancel={() => setRejectOpen(false)}
        onOk={() => {
          if (!transfer || !rejectReason.trim()) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await rejectTransfer(transfer.id, rejectReason.trim());
              setTransfer(updated);
              setRejectOpen(false);
              message.success('Transfer rejected');
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Reject failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        <Text type="secondary" className="mb-2 block">
          Reason is required
        </Text>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          placeholder="Why is this transfer rejected?"
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </DashboardLayout>
  );
}
