import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Col, Descriptions, Divider, Input, Modal, Progress, Row, Space, Steps, Table, Tag, Typography,
} from 'antd';
import {
  AlertFilled, ArrowLeftOutlined, BellOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, ExperimentOutlined, PlayCircleOutlined, UserOutlined,
} from '@ant-design/icons';
import { enqueueSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetTaskQuery,
  useGetTasksQuery,
  useUpdateTaskStatusMutation,
  useRequestEmergencyDispatchMutation,
} from '../../store/api/apiSlice';

const { Text, Title } = Typography;

const typeColor = { Production: '#B11E6A', 'Sticker Work': '#8a1652', Packing: '#C94F8A', Procurement: '#D85C9E', Internal: '#6b1240' };
const priorityColor = { Urgent: '#6b1240', High: '#B11E6A', Medium: '#C94F8A', Normal: '#D85C9E' };
const statusColor = { 'In Progress': '#B11E6A', Pending: '#C94F8A', Completed: '#6b1240', Done: '#6b1240' };
const paymentColor = { Paid: 'success', Pending: 'warning', Partial: 'orange' };

const labelStyle = {
  fontSize: 11, color: '#B11E6A', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600,
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const { data: taskData, isLoading } = useGetTaskQuery(id);
  const { data: allTasksData } = useGetTasksQuery();

  const [updateTaskStatus] = useUpdateTaskStatusMutation();
  const [requestEmergencyDispatch, { isLoading: requesting }] = useRequestEmergencyDispatchMutation();

  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');

  const t = taskData?.data;

  const orderId = t?.orderId?._id?.toString() || (typeof t?.orderId === 'string' ? t.orderId : null);
  const isSample = t?.orderId?.orderCategory === 'SAMPLE' || t?.orderId?.leadId?.leadType === 'SAMPLE';
  const displayStatus = t?.status === 'Done' ? 'Completed' : t?.status;

  const siblingTasks = useMemo(() => {
    if (!orderId || !allTasksData?.data) return [];
    return allTasksData.data
      .filter((s) => {
        const sOrdId = (typeof s.orderId === 'object' ? s.orderId?._id : s.orderId)?.toString();
        return sOrdId === orderId && s._id !== id;
      })
      .map((s) => ({
        key: s._id,
        id: s.taskCode,
        type: s.taskType || 'Packing',
        product: s.product || '—',
        assignee: s.assignedTo?.fullName || s.assigneeName || '—',
        status: s.status === 'Done' ? 'Completed' : s.status,
        due: s.dueDate ? s.dueDate.slice(0, 10) : '—',
      }));
  }, [allTasksData, orderId, id]);

  const pendingCount = siblingTasks.filter((s) => s.status === 'Pending' || s.status === 'In Progress').length;
  const doneCount = siblingTasks.filter((s) => s.status === 'Completed').length;

  const handleStatus = async (status) => {
    try {
      await updateTaskStatus({ id, status }).unwrap();
      enqueueSnackbar(`Task marked as ${status}`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Failed to update status', { variant: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Text>Loading task details...</Text>
      </div>
    );
  }

  if (!t) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message="Task not found" />
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')} style={{ marginTop: 16 }}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const cardStyle = { borderRadius: 12, marginBottom: 0 };

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb
        items={[{ label: 'Task Management', path: '/tasks' }, { label: t.taskCode }]}
      />

      {/* Header */}
      <Card style={{ ...cardStyle, marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space size={12} wrap>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>Back</Button>
            <div>
              <Space size={8} align="center">
                {(t.isEmergency || t.priority === 'Urgent') && <AlertFilled style={{ color: '#ff4d4f', fontSize: 16 }} />}
                {isSample && <ExperimentOutlined style={{ color: '#722ed1', fontSize: 16 }} />}
                <Title level={4} style={{ margin: 0 }}>{t.taskCode}</Title>
                <Tag color={statusColor[displayStatus]}>{displayStatus}</Tag>
                <Tag color={priorityColor[t.priority || 'Normal']}>{t.priority || 'Normal'}</Tag>
              </Space>
              <Text type="secondary" style={{ display: 'block', marginTop: 2 }}>{t.taskName}</Text>
            </div>
          </Space>

          {/* Action buttons */}
          <Space wrap>
            {t.status === 'Pending' && (
              <Button type="primary" icon={<PlayCircleOutlined />}
                style={{ background: '#1890ff', border: 'none' }}
                onClick={() => handleStatus('In Progress')}>
                Start Task
              </Button>
            )}
            {t.status === 'In Progress' && (
              <Button type="primary" icon={<CheckCircleOutlined />}
                style={{ background: '#52c41a', border: 'none' }}
                onClick={() => handleStatus('Done')}>
                Mark Done
              </Button>
            )}
            {(t.status === 'Pending' || t.status === 'In Progress' || (t.status === 'Done' && t.paymentStatus !== 'Paid')) && !isSample && (
              <Button danger icon={<ExclamationCircleOutlined />}
                onClick={() => { setEmergencyReason(''); setEmergencyModalOpen(true); }}>
                {t.emergencyRequested ? 'View Emergency Status' : 'Emergency Dispatch'}
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Left column */}
        <Col xs={24} lg={14}>

          {/* Task Information */}
          <Card title={<Text style={labelStyle}>Task Information</Text>} style={cardStyle} styles={{ body: { padding: '0 16px 16px' } }}>
            <Descriptions bordered size="small" column={2} style={{ marginTop: 12, borderRadius: 8 }}>
              <Descriptions.Item label="Task ID"><Text strong>{t.taskCode}</Text></Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={typeColor[t.taskType]}>{t.taskType || '—'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={priorityColor[t.priority || 'Normal']}>{t.priority || 'Normal'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColor[displayStatus]}>{displayStatus}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Assigned To" span={2}>
                <Space>
                  <Avatar size={22} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />
                  <Text strong>{t.assignedTo?.fullName || t.assigneeName || 'Unassigned'}</Text>
                  {t.assignedTo?.role && <Tag style={{ fontSize: 11 }}>{t.assignedTo.role}</Tag>}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Due Date">{t.dueDate ? t.dueDate.slice(0, 10) : '—'}</Descriptions.Item>
              {t.printingType && (
                <Descriptions.Item label="Printing Type">{t.printingType}</Descriptions.Item>
              )}
              {t.startedAt && (
                <Descriptions.Item label="Started">
                  {new Date(t.startedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </Descriptions.Item>
              )}
              {t.completedAt && (
                <Descriptions.Item label="Completed">
                  {new Date(t.completedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </Descriptions.Item>
              )}
              {t.description && (
                <Descriptions.Item label="Description" span={2}>{t.description}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* Sub-tasks */}
          {t.subTasks?.length > 0 && (
            <Card
              title={<Text style={labelStyle}>Sub-tasks</Text>}
              style={{ ...cardStyle, marginTop: 16 }}
              styles={{ body: { padding: '0 16px 16px' } }}
            >
              <Table
                dataSource={t.subTasks.map((s, i) => ({ ...s, key: i }))}
                pagination={false}
                size="small"
                style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden' }}
                columns={[
                  { title: 'Sub-task', dataIndex: 'label', render: (v) => <Text strong>{v || '—'}</Text> },
                  { title: 'Qty', dataIndex: 'qty', render: (v) => v ? v.toLocaleString() : '—' },
                  {
                    title: 'Assigned To', dataIndex: 'assigneeName',
                    render: (v) => v
                      ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                      : <Text type="secondary">—</Text>,
                  },
                  {
                    title: 'Status', dataIndex: 'done',
                    render: (v) => v
                      ? <Tag color="success" icon={<CheckCircleOutlined />}>Done</Tag>
                      : <Tag color="processing" icon={<ClockCircleOutlined />}>Pending</Tag>,
                  },
                ]}
              />
            </Card>
          )}

          {/* Other tasks on the same order */}
          {siblingTasks.length > 0 && (
            <Card
              title={
                <Space>
                  <Text style={labelStyle}>Other Tasks on this Order</Text>
                  {pendingCount > 0 && <Tag color="warning">{pendingCount} Pending / In Progress</Tag>}
                  {doneCount > 0 && <Tag color="success">{doneCount} Completed</Tag>}
                </Space>
              }
              style={{ ...cardStyle, marginTop: 16 }}
              styles={{ body: { padding: '0 16px 16px' } }}
            >
              <Table
                dataSource={siblingTasks}
                pagination={false}
                size="small"
                style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden' }}
                onRow={(r) => ({ onClick: () => navigate(`/tasks/${r.key}`) })}
                columns={[
                  {
                    title: 'Task ID', dataIndex: 'id',
                    render: (v, r) => (
                      <Button type="link" style={{ color: '#B11E6A', padding: 0, fontWeight: 700 }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/tasks/${r.key}`); }}>
                        {v}
                      </Button>
                    ),
                  },
                  { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                  { title: 'Product', dataIndex: 'product' },
                  {
                    title: 'Assigned To', dataIndex: 'assignee',
                    render: (v) => v && v !== '—'
                      ? <Space size={4}><Avatar size={16} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space>
                      : <Text type="secondary" style={{ fontSize: 11 }}>Unassigned</Text>,
                  },
                  { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]} style={{ fontSize: 11 }}>{v}</Tag> },
                  { title: 'Due', dataIndex: 'due' },
                ]}
              />
            </Card>
          )}
        </Col>

        {/* Right column */}
        <Col xs={24} lg={10}>

          {/* Order Details */}
          {t.orderId && (
            <Card title={<Text style={labelStyle}>Order Details</Text>} style={cardStyle} styles={{ body: { padding: '0 16px 16px' } }}>
              <Descriptions bordered size="small" column={1} style={{ marginTop: 12, borderRadius: 8 }}>
                <Descriptions.Item label="Order ID">
                  <Text strong style={{ color: '#B11E6A' }}>{t.orderId.orderCode}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Hotel / Client">
                  <Text strong>{t.orderId.clientName || t.clientName || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="This Task's Product">
                  {t.product || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Quantity">
                  {(t.qty ?? 0).toLocaleString()} units
                </Descriptions.Item>
                {t.orderId.expectedDeliveryDate && (
                  <Descriptions.Item label="Expected Delivery">
                    {t.orderId.expectedDeliveryDate.slice(0, 10)}
                  </Descriptions.Item>
                )}
                {t.orderId.status && (
                  <Descriptions.Item label="Order Status">
                    <Tag color="processing">{t.orderId.status}</Tag>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Payment">
                  {t.paymentStatus
                    ? <Tag color={paymentColor[t.paymentStatus]}>{t.paymentStatus}</Tag>
                    : 'N/A'}
                </Descriptions.Item>
              </Descriptions>

              {/* All products in this order */}
              {t.orderId.items?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 6 }}>
                    All products in this order
                  </Text>
                  <Table
                    dataSource={t.orderId.items.map((it, i) => ({ ...it, key: i }))}
                    pagination={false}
                    size="small"
                    style={{ borderRadius: 8, overflow: 'hidden' }}
                    columns={[
                      {
                        title: 'Product', dataIndex: 'itemName',
                        render: (v, r) => (
                          <Space size={4}>
                            {v === t.product && <Tag color="#B11E6A" style={{ fontSize: 10, padding: '0 4px' }}>This task</Tag>}
                            <Text strong={v === t.product}>{v || '—'}</Text>
                          </Space>
                        ),
                      },
                      { title: 'Qty', dataIndex: 'qty', render: (v) => v ? v.toLocaleString() : '—' },
                      { title: 'Logo', dataIndex: 'logoType', render: (v) => v ? <Tag style={{ fontSize: 10 }}>{v}</Tag> : '—' },
                    ]}
                  />
                </div>
              )}
            </Card>
          )}

          {/* Product Details (Brand / Packing Material / Material Category) */}
          {t.productDetails && (
            t.productDetails.brand || t.productDetails.packingMaterial
            || t.productDetails.materialCategory || t.productDetails.category
            || t.productDetails.unit || t.productDetails.size || t.productDetails.hsnCode
          ) && (
            <Card
              title={<Text style={labelStyle}>Product Details</Text>}
              style={{ ...cardStyle, marginTop: t.orderId ? 16 : 0 }}
              styles={{ body: { padding: '0 16px 16px' } }}
            >
              <Descriptions bordered size="small" column={1} style={{ marginTop: 12, borderRadius: 8 }}>
                <Descriptions.Item label="Product">
                  <Text strong>{t.product || t.productDetails.itemName || '—'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Brand">
                  {t.productDetails.brand
                    ? <Tag color="#B11E6A">{t.productDetails.brand}</Tag>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Packing Material">
                  {t.productDetails.packingMaterial
                    ? <Tag color="#C94F8A">{t.productDetails.packingMaterial}</Tag>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                <Descriptions.Item label="Material Category">
                  {t.productDetails.materialCategory
                    ? <Tag color="#D85C9E">{t.productDetails.materialCategory}</Tag>
                    : <Text type="secondary">—</Text>}
                </Descriptions.Item>
                {t.productDetails.size && (
                  <Descriptions.Item label="Size">{t.productDetails.size}</Descriptions.Item>
                )}
                {t.productDetails.unit && (
                  <Descriptions.Item label="Unit">{t.productDetails.unit}</Descriptions.Item>
                )}
                {t.productDetails.hsnCode && (
                  <Descriptions.Item label="HSN Code">{t.productDetails.hsnCode}</Descriptions.Item>
                )}
              </Descriptions>
              {t.productDetails.source === 'order' && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                  Shown from order line item — product not found in inventory master.
                </Text>
              )}
            </Card>
          )}

          {/* Alerts */}
          <div style={{ marginTop: t.orderId ? 16 : 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {t.orderId?.orderCategory !== 'SAMPLE' && t.orderId?.leadId?.leadType !== 'SAMPLE'
              && t.status === 'Done' && (t.paymentStatus || 'Pending') !== 'Paid' && (
              <Alert type="warning" showIcon icon={<BellOutlined />}
                message="Sales Follow-up Required"
                description={`${t.assignedTo?.fullName || t.assigneeName || 'Sales person'} should contact ${t.orderId?.clientName || t.clientName || 'client'} regarding payment.`}
                style={{ borderRadius: 8 }}
              />
            )}
            {displayStatus === 'Completed' && !isSample && t.paymentStatus && t.paymentStatus !== 'Paid' && (
              <Alert type="error" showIcon icon={<ExclamationCircleOutlined />}
                message="Dispatch Blocked — Payment Pending"
                description={`Payment status: "${t.paymentStatus}". Dispatch requires full payment or Emergency Dispatch approval.`}
                style={{ borderRadius: 8 }}
              />
            )}
            {t.isEmergency && (
              <Alert type={t.emergencyApproved ? 'success' : 'error'} showIcon icon={<AlertFilled />}
                message={t.emergencyApproved ? 'Emergency Dispatch Approved' : t.emergencyRequested ? 'Emergency Dispatch — Pending Approvals' : 'Emergency — Awaiting Approval'}
                description={
                  t.emergencyApproved
                    ? 'Both Sales Head and Ops Head have approved. Emergency dispatch can proceed immediately.'
                    : t.emergencyRequested
                    ? `Sales Head: ${t.emergencySalesApproved ? 'Approved ✓' : 'Pending — go to Sales page'} | Ops Head: ${t.emergencyOpsApproved ? 'Approved ✓' : t.emergencySalesApproved ? 'Pending — go to Operations page' : 'Locked until Sales Head approves'}`
                    : 'Awaiting Sales Head + Operations Head dual approval.'
                }
                style={{ borderRadius: 8 }}
              />
            )}
          </div>
        </Col>
      </Row>

      {/* ── Emergency Dispatch Modal ─────────────────────────────────────── */}
      <Modal
        title={<Space><ExclamationCircleOutlined style={{ color: '#f5222d' }} /><span>Emergency Dispatch</span></Space>}
        open={emergencyModalOpen}
        onCancel={() => setEmergencyModalOpen(false)}
        width={Math.min(560, window.innerWidth - 32)}
        footer={null}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
          <Alert type="warning" showIcon
            message="Payment Pending — Emergency Dispatch Required"
            description="This order is complete but payment has not been received. Emergency dispatch allows immediate delivery and requires approval from Sales Head followed by Operations Head."
            style={{ borderRadius: 8 }}
          />

          {/* Order summary */}
          <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
            <Descriptions.Item label="Task ID"><span style={{ color: '#B11E6A', fontWeight: 700 }}>{t.taskCode}</span></Descriptions.Item>
            <Descriptions.Item label="Order">{t.orderId?.orderCode || '—'}</Descriptions.Item>
            <Descriptions.Item label="Client">{t.orderId?.clientName || t.clientName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Product">{t.product || '—'}</Descriptions.Item>
            <Descriptions.Item label="Payment Status"><Tag color="warning">{t.paymentStatus || 'Pending'}</Tag></Descriptions.Item>
            <Descriptions.Item label="Task Status"><Tag color="processing">{displayStatus}</Tag></Descriptions.Item>
          </Descriptions>

          {!t.emergencyRequested ? (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                After submitting, this request will be sent to the <strong>Sales Head</strong> (via Sales page) and then to the <strong>Operations Head</strong> (via Operations page) for sequential approval.
              </Typography.Text>
              <Input.TextArea
                rows={3}
                placeholder="Reason for emergency dispatch (required)..."
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                style={{ borderRadius: 8 }}
              />
              <Button
                type="primary" danger
                loading={requesting}
                disabled={!emergencyReason.trim()}
                onClick={async () => {
                  try {
                    await requestEmergencyDispatch({ id, reason: emergencyReason }).unwrap();
                    enqueueSnackbar('Emergency dispatch requested — awaiting Sales Head approval', { variant: 'success' });
                    setEmergencyModalOpen(false);
                    setEmergencyReason('');
                  } catch (err) {
                    enqueueSnackbar(err?.data?.message || 'Failed to request emergency dispatch', { variant: 'error' });
                  }
                }}
              >
                Request Emergency Dispatch
              </Button>
            </>
          ) : (
            <>
              <Divider style={{ margin: '4px 0' }} />
              <Typography.Text strong style={{ display: 'block', marginBottom: 4 }}>Approval Progress</Typography.Text>
              {t.emergencyReason && (
                <Alert type="info" showIcon message={`Reason: ${t.emergencyReason}`} style={{ borderRadius: 8, marginBottom: 4 }} />
              )}
              <Steps
                direction="vertical"
                size="small"
                current={t.emergencyApproved ? 2 : t.emergencySalesApproved ? 1 : 0}
                items={[
                  {
                    title: 'Sales Head Approval',
                    description: t.emergencySalesApproved
                      ? 'Approved — Sales Head has authorized emergency dispatch'
                      : 'Pending — Sales Head must approve in the Sales page',
                    status: t.emergencySalesApproved ? 'finish' : 'process',
                  },
                  {
                    title: 'Operations Head Approval',
                    description: t.emergencyOpsApproved
                      ? 'Approved — Ops Head has authorized emergency dispatch'
                      : t.emergencySalesApproved
                      ? 'Pending — Ops Head must approve in the Operations page'
                      : 'Locked — awaiting Sales Head approval first',
                    status: t.emergencyOpsApproved ? 'finish' : t.emergencySalesApproved ? 'process' : 'wait',
                  },
                  {
                    title: 'Emergency Dispatch Authorized',
                    description: t.emergencyApproved ? 'Both approvals received — proceed with dispatch immediately' : 'Waiting for both approvals',
                    status: t.emergencyApproved ? 'finish' : 'wait',
                  },
                ]}
              />
              {t.emergencyApproved && (
                <Alert type="success" showIcon message="Emergency dispatch fully approved. Proceed immediately." style={{ borderRadius: 8 }} />
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
