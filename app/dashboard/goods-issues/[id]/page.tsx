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
  ExportOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { BRAND } from '../../../lib/brand';
import {
  approveGoodsIssue,
  cancelGoodsIssue,
  fetchGoodsIssueById,
  formatIssueDate,
  formatIssuePerson,
  issueGoodsIssue,
  rejectGoodsIssue,
  submitGoodsIssue,
  ISSUE_STATUS_COLORS,
  ISSUE_STATUS_LABELS,
  ISSUE_WORKFLOW_STEPS,
  type GoodsIssue,
  type GoodsIssueLine,
  type GoodsIssueStatus,
} from '../../../lib/goodsIssuesApi';

const { Title, Text } = Typography;

function workflowStepIndex(status: GoodsIssueStatus): number {
  if (status === 'cancelled' || status === 'rejected') return -1;
  return ISSUE_WORKFLOW_STEPS.indexOf(status);
}

export default function GoodsIssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [issue, setIssue] = useState<GoodsIssue | null>(null);
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
      const r = await fetchGoodsIssueById(id);
      setIssue(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load issue');
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    action: () => Promise<GoodsIssue>,
    successMsg: string
  ) => {
    setActing(true);
    try {
      const updated = await action();
      setIssue(updated);
      message.success(successMsg);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const stepIndex = issue ? workflowStepIndex(issue.status) : 0;

  const lineColumns: TableProps<GoodsIssueLine>['columns'] = useMemo(
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
        title: 'Location',
        key: 'location',
        render: (_, r) =>
          r.location
            ? r.location.fullPath || `${r.location.code} — ${r.location.name}`
            : '—',
      },
    ],
    []
  );

  const actionBar = issue ? (
    <Space wrap>
      {issue.status === 'draft' && (
        <>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={acting}
            onClick={() =>
              void runAction(
                () => submitGoodsIssue(issue.id),
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
                content: 'The issue will be marked cancelled and become read-only.',
                okText: 'Cancel issue',
                okButtonProps: { danger: true },
                onOk: () =>
                  runAction(() => cancelGoodsIssue(issue.id), 'Issue cancelled'),
              });
            }}
          >
            Cancel
          </Button>
        </>
      )}

      {issue.status === 'pending_approval' && (
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
        </>
      )}

      {issue.status === 'approved' && (
        <Button
          type="primary"
          icon={<ExportOutlined />}
          loading={acting}
          onClick={() => {
            Modal.confirm({
              title: 'Issue / pick this stock?',
              content:
                'Stock will be deducted from the warehouse. This cannot be undone.',
              okText: 'Issue stock',
              onOk: () =>
                runAction(
                  () => issueGoodsIssue(issue.id),
                  'Stock issued — inventory deducted'
                ),
            });
          }}
        >
          Issue / Pick
        </Button>
      )}
    </Space>
  ) : null;

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error || !issue ? (
        <Result
          status="error"
          title="Issue not found"
          subTitle={error ?? 'Unknown error'}
          extra={
            <Button onClick={() => router.push('/dashboard/goods-issues')}>
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
                onClick={() => router.push('/dashboard/goods-issues')}
              >
                Goods Issues
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <Title level={3} className="!mb-0 font-mono">
                  {issue.issueNumber || 'Issue'}
                </Title>
                <Tag color={ISSUE_STATUS_COLORS[issue.status]}>
                  {ISSUE_STATUS_LABELS[issue.status]}
                </Tag>
              </div>
              <Text type="secondary">
                {issue.warehouse.code} {issue.warehouse.name}
                {issue.department ? ` · ${issue.department}` : ''}
              </Text>
            </div>
            {actionBar}
          </div>

          {issue.status === 'cancelled' || issue.status === 'rejected' ? (
            <Alert
              type="error"
              showIcon
              message={issue.status === 'rejected' ? 'Rejected' : 'Cancelled'}
              description={
                issue.rejectionReason
                  ? `Reason: ${issue.rejectionReason}`
                  : undefined
              }
            />
          ) : (
            <Card size="small">
              <Steps
                size="small"
                current={Math.max(0, stepIndex)}
                items={ISSUE_WORKFLOW_STEPS.map((s) => ({
                  title: ISSUE_STATUS_LABELS[s],
                }))}
              />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Summary" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Warehouse">
                  <span className="font-mono text-xs" style={{ color: BRAND }}>
                    {issue.warehouse.code}
                  </span>{' '}
                  {issue.warehouse.name}
                </Descriptions.Item>
                <Descriptions.Item label="Department">
                  {issue.department || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Requester">
                  {issue.requesterName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {issue.notes || '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="People & timestamps" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Requested">
                  {formatIssuePerson(issue.requestedBy)}
                  {' · '}
                  {formatIssueDate(issue.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Approved">
                  {formatIssuePerson(issue.approvedBy)}
                  {' · '}
                  {formatIssueDate(issue.approvedAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Issued">
                  {formatIssuePerson(issue.issuedBy)}
                  {' · '}
                  {formatIssueDate(issue.issuedAt)}
                </Descriptions.Item>
                {(issue.cancelledAt || issue.rejectedAt) && (
                  <Descriptions.Item label="Cancelled / rejected">
                    {formatIssuePerson(issue.rejectedBy)}
                    {' · '}
                    {formatIssueDate(issue.cancelledAt ?? issue.rejectedAt)}
                    {issue.rejectionReason
                      ? ` — ${issue.rejectionReason}`
                      : ''}
                  </Descriptions.Item>
                )}
              </Descriptions>
              {issue.approval && (
                <div className="mt-3">
                  <Button
                    type="link"
                    className="!px-0"
                    onClick={() =>
                      router.push(
                        issue.approval?.id
                          ? `/dashboard/approvals/${issue.approval.id}`
                          : '/dashboard/approvals'
                      )
                    }
                  >
                    View in Approvals ({issue.approval.approvalNumber || 'open'})
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
              dataSource={issue.lines}
            />
          </Card>
        </div>
      )}

      <Modal
        title="Approve issue"
        open={approveOpen}
        okText="Approve"
        confirmLoading={acting}
        onCancel={() => setApproveOpen(false)}
        onOk={() => {
          if (!issue) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await approveGoodsIssue(
                issue.id,
                reviewNotes.trim() || undefined
              );
              setIssue(updated);
              setApproveOpen(false);
              message.success('Issue approved — ready to pick');
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Approve failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        <Text type="secondary" className="mb-2 block">
          Optional review notes
        </Text>
        <Input.TextArea
          rows={3}
          value={reviewNotes}
          placeholder="e.g. OK to issue"
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      </Modal>

      <Modal
        title="Reject issue"
        open={rejectOpen}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={acting}
        onCancel={() => setRejectOpen(false)}
        onOk={() => {
          if (!issue || !rejectReason.trim()) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await rejectGoodsIssue(
                issue.id,
                rejectReason.trim()
              );
              setIssue(updated);
              setRejectOpen(false);
              message.success('Issue rejected');
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
          placeholder="Why is this issue rejected?"
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </DashboardLayout>
  );
}
