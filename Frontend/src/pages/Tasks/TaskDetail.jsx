import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Avatar, Button, Card, Col, Descriptions, Progress, Row, Space, Table, Tag, Typography,
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
    <div style={{ padding: '0 0 32px' }}>
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
            {(t.status === 'Pending' || t.status === 'In Progress') && !isSample && (
              <Button danger icon={<ExclamationCircleOutlined />}
                onClick={() => handleStatus('Emergency')}>
                Emergency
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
              <Alert type="error" showIcon icon={<AlertFilled />}
                message={t.emergencyApproved ? 'Emergency Dispatch Approved' : 'Emergency — Awaiting Approval'}
                description={t.emergencyApproved ? 'This order has been approved for emergency dispatch.' : 'Awaiting Sales Person + Operation Head dual approval.'}
                style={{ borderRadius: 8 }}
              />
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
}
