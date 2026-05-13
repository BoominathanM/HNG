import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  BoxPlotOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  EyeOutlined,
  FileImageOutlined,
  InboxOutlined,
  KeyOutlined,
  LockOutlined,
  MessageOutlined,
  PlusOutlined,
  PrinterOutlined,
  SafetyOutlined,
  SearchOutlined,
  SyncOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
  TruckOutlined,
  UploadOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  canAssignTaskFromChecks,
  designColor,
  designerCredentials,
  designQueue,
  FLOW_STAGES,
  getCheckStateMap,
  getFlowStep,
  getProgressFromChecks,
  operationEmployees,
  operationOrders,
  productionQueues,
  statusPill,
} from './data';

const { Text, Title } = Typography;
const { Option } = Select;

const queueStatuses = [
  'Sent',
  'Design Confirmation',
  'In Process',
  'Dispatch',
  'Received',
  'Pending Approval',
  'Design Change',
];

const flowStageColors = ['default', 'blue', 'gold', 'magenta', 'green', 'success'];
const flowNextActions = {
  0: { label: 'Send To Design', tab: 'design' },
  3: { label: 'Verify Stock', tab: 'overview' },
  4: { label: 'Assign Task', tab: 'tasks' },
};

const statusIcons = {
  Sent: <MessageOutlined />,
  'Design Confirmation': <CheckCircleOutlined />,
  'In Process': <SyncOutlined />,
  Dispatch: <TruckOutlined />,
  Received: <InboxOutlined />,
  'Pending Approval': <SafetyOutlined />,
  'Design Change': <ToolOutlined />,
};

export default function Operations() {
  const navigate = useNavigate();
  const isDark = useSelector((state) => state.theme.isDark);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [checkStates] = useState(getCheckStateMap());
  const [requestOpen, setRequestOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [requestType, setRequestType] = useState('Sticker');
  const [selectedQueueItem, setSelectedQueueItem] = useState(null);
  const [requestForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [correctionForm] = Form.useForm();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [dispatchForm] = Form.useForm();
  const [receiveForm] = Form.useForm();

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const mutedBg = isDark ? '#161622' : '#faf8fb';
  const textColor = isDark ? '#ececf1' : '#1a1a2e';

  const filteredOrders = useMemo(
    () =>
      operationOrders.filter((order) => {
        const query = searchText.trim().toLowerCase();
        if (!query) return true;
        return (
          order.id.toLowerCase().includes(query) ||
          order.hotelLogo.toLowerCase().includes(query) ||
          order.specsSummary.toLowerCase().includes(query) ||
          order.items.some((item) => item.product.toLowerCase().includes(query))
        );
      }),
    [searchText]
  );

  const stats = [
    {
      label: 'Order Pending',
      value: operationOrders.filter((order) => !canAssignTaskFromChecks(checkStates[order.id])).length,
      color: '#C94F8A',
    },
    {
      label: 'Sticker Delivery',
      value: productionQueues.sticker.filter((item) => item.sent > 0 && !item.verified).length,
      color: '#B11E6A',
    },
    {
      label: 'Approval Waiting',
      value: operationOrders.filter((order) => order.designStatus === 'Pending Approval').length,
      color: '#8a1652',
    },
    {
      label: 'Box',
      value: productionQueues.box.length,
      color: '#6b1240',
    },
    {
      label: 'Frosted',
      value: productionQueues.frosted.length,
      color: '#aa3f72',
    },
    {
      label: 'Ready To Process',
      value: operationOrders.filter((order) => canAssignTaskFromChecks(checkStates[order.id])).length,
      color: '#1677ff',
    },
  ];

  const orderColumns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      render: (value) => <Text strong style={{ color: '#B11E6A' }}>{value}</Text>,
    },
    { title: 'Hotel Name', dataIndex: 'hotelLogo' },
    {
      title: 'Order Delivery Date',
      dataIndex: 'createdAt',
      render: (value) => new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }),
      responsive: ['md'],
    },
    {
      title: 'Pipeline Stage',
      key: 'flowStage',
      render: (_, record) => {
        const step = getFlowStep(record);
        const next = flowNextActions[step];
        return (
          <Space direction="vertical" size={4}>
            <Tag color={flowStageColors[step]}>{FLOW_STAGES[step]}</Tag>
            {next && (
              <Button
                size="small"
                type="primary"
                style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', fontSize: 11 }}
                onClick={() => navigate(`/operations/${record.id}?tab=${next.tab}`)}
              >
                {next.label}
              </Button>
            )}
          </Space>
        );
      },
    },
    { title: 'Assigned To', dataIndex: 'assignedEmployee', responsive: ['lg'] },
    {
      title: 'Process',
      key: 'progress',
      render: (_, record) => {
        const percent = getProgressFromChecks(checkStates[record.id]);
        const ready = canAssignTaskFromChecks(checkStates[record.id]);
        return (
          <Space direction="vertical" size={2} style={{ width: 180 }}>
            <Progress percent={percent} size="small" strokeColor="#B11E6A" status={ready ? 'success' : 'active'} />
            <Text style={{ fontSize: 11 }}>{ready ? 'Assignment unlocked' : record.operationStage}</Text>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={designColor[record.designStatus] || 'default'}>{record.designStatus}</Tag>
          <Tag color={statusPill[record.stockStatus] || 'default'}>{record.stockStatus}</Tag>
          {record.printerVerified && <Tag color="success">Material Verified</Tag>}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="View full operation screen">
            <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/operations/${record.id}`)} />
          </Tooltip>
          <Tooltip title="Open design view">
            <Button size="small" icon={<FileImageOutlined />} onClick={() => navigate(`/operations/${record.id}?tab=design`)} />
          </Tooltip>
        </Space>
      ),
    },
  ];


  const designColumns = [
    {
      title: 'Order',
      dataIndex: 'orderId',
      render: (value) => <Text strong style={{ color: '#B11E6A' }}>{value}</Text>,
    },
    { title: 'Hotel Logo', dataIndex: 'hotelLogo' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Shared Through', dataIndex: 'channel' },
    { title: 'Designer', dataIndex: 'designer' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Tag color={designColor[value] || 'default'}>{value}</Tag>,
    },
    { title: 'Correction / Note', dataIndex: 'correction' },
    {
      title: 'Actions',
      key: 'designActions',
      render: (_, record) => (
        <Space wrap size={4}>
          <Button
            size="small"
            icon={<MessageOutlined />}
            style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}
            onClick={() => message.success(`Design for ${record.orderId} sent via WhatsApp to customer and ${operationOrders.find((o) => o.id === record.orderId)?.salesPerson || 'sales person'}`)}
          >
            Send
          </Button>
          <Button
            size="small"
            icon={<CheckCircleOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
            onClick={() => message.success(`${record.orderId} approved — printing can start now`)}
          >
            Approve
          </Button>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => message.info(`Printing order raised for ${record.orderId}`)}
          >
            Print
          </Button>
          <Button
            size="small"
            icon={<ToolOutlined />}
            onClick={() => {
              setSelectedQueueItem(record);
              setCorrections(record.correction ? [record.correction] : []);
              setCorrectionOpen(true);
            }}
          >
            Correction
          </Button>
        </Space>
      ),
    },
  ];

  const renderDesignTable = (type) => (
    <Card
      title={<Text strong style={{ color: textColor }}>{type} Designing Queue</Text>}
      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
      styles={{ body: { padding: 0 } }}
    >
      <div className="table-responsive" style={{ padding: 4 }}>
        <Table 
          dataSource={designQueue.filter(item => item.type === type)} 
          columns={designColumns} 
          pagination={false} 
          size="small" 
        />
      </div>
    </Card>
  );

  const queueColumns = (label) => [
    {
      title: 'Order',
      dataIndex: 'orderId',
      render: (value) => <Text strong style={{ color: '#B11E6A' }}>{value}</Text>,
    },
    { title: 'Hotel Logo', dataIndex: 'hotelLogo' },
    { title: 'Product', dataIndex: 'product' },
    {
      title: label === 'Box' ? 'Size / PVK' : 'Size',
      dataIndex: 'size',
      render: (value) => <Tag color="geekblue">{value}</Tag>,
    },
    { title: 'Qty', dataIndex: 'qty', render: (value) => value.toLocaleString() },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Tag color={designColor[value] || 'default'}>{value}</Tag>,
    },
    {
      title: 'Dispatch Info',
      key: 'dispatchInfo',
      render: (_, record) => (
        record.dispatchDate ? (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 11 }}>{record.dispatchDate}</Text>
            <Text type="secondary" style={{ fontSize: 10 }}>{record.dispatchTime}</Text>
          </Space>
        ) : <Text type="secondary" style={{ fontSize: 11 }}>-</Text>
      ),
    },
    {
      title: 'Arrival Info',
      key: 'arrivalInfo',
      render: (_, record) => (
        record.arrivalDate ? (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 11 }}>{record.arrivalDate}</Text>
            <Tag color="green" style={{ fontSize: 10 }}>Received</Tag>
          </Space>
        ) : <Text type="secondary" style={{ fontSize: 11 }}>-</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isApproved = record.status === 'Approved' || record.workStarted;
        const isDispatched = !!record.dispatchDate;
        const isReceived = !!record.arrivalDate;
        const isVerified = record.materialVerified;

        return (
          <Space wrap>
            {!isApproved && (
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a', color: '#fff' }}
                onClick={() => {
                  record.workStarted = true;
                  message.success(`${record.orderId} team started work`);
                }}
              >
                Approve
              </Button>
            )}
            {isApproved && !isDispatched && (
              <>
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() => message.info(`Printing triggered for ${record.orderId}`)}
                >
                  Print
                </Button>
                <Button
                  size="small"
                  icon={<MessageOutlined />}
                  style={{ background: '#1677ff', borderColor: '#1677ff', color: '#fff' }}
                  onClick={() => {
                    setSelectedQueueItem(record);
                    dispatchForm.setFieldsValue({
                      orderId: record.orderId,
                      dispatchDate: new Date().toLocaleDateString('en-IN'),
                      dispatchTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    });
                    setDispatchOpen(true);
                  }}
                >
                  Dispatch
                </Button>
              </>
            )}
            {isDispatched && !isReceived && (
              <Button
                size="small"
                icon={<InboxOutlined />}
                style={{ background: '#faad14', borderColor: '#faad14', color: '#fff' }}
                onClick={() => {
                  setSelectedQueueItem(record);
                  receiveForm.setFieldsValue({
                    orderId: record.orderId,
                    arrivalDate: new Date().toLocaleDateString('en-IN')
                  });
                  setReceiveOpen(true);
                }}
              >
                Receive
              </Button>
            )}
            {isReceived && !isVerified && (
              <Button
                size="small"
                icon={<SafetyOutlined />}
                style={{ background: '#eb2f96', borderColor: '#eb2f96', color: '#fff' }}
                onClick={() => {
                  record.materialVerified = true;
                  message.success(`${record.type} Material Verified and Stock Updated`);
                }}
              >
                Verify Arrived Material
              </Button>
            )}
            {isVerified && <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>}
          </Space>
        );
      },
    },
  ];

  const openRequestModal = (type) => {
    setRequestType(type);
    requestForm.resetFields();
    setRequestOpen(true);
  };

  const renderQueueCard = (type, rows, label) => (
    <div>
      {renderQueueSummary(rows)}
      <Card
        title={<Text strong style={{ color: textColor }}>{label}</Text>}
        extra={
          <Button icon={<PlusOutlined />} onClick={() => openRequestModal(type)}>
            New {type} Request
          </Button>
        }
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: 0 } }}
      >
        <div className="table-responsive" style={{ padding: 4 }}>
          <Table dataSource={rows} columns={queueColumns(type)} pagination={type === 'Sticker' ? { pageSize: 5, size: 'small' } : false} size="small" />
        </div>
      </Card>
    </div>
  );

  const renderQueueSummary = (rows) => {
    const countByStatus = Object.fromEntries(queueStatuses.map((status) => [status, 0]));
    rows.forEach((row) => {
      if (countByStatus[row.status] !== undefined) countByStatus[row.status] += 1;
    });
    return (
      <div style={{ marginBottom: 24, overflowX: 'auto', padding: '4px 0' }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 900 }}>
          {queueStatuses.map((status) => (
            <Card
              key={status}
              size="small"
              style={{
                flex: 1,
                borderRadius: 12,
                border: 'none',
                background: cardBg,
                boxShadow: '0 2px 10px rgba(177,30,106,0.05)',
                minWidth: 120,
              }}
              styles={{ body: { padding: '12px 8px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 8, 
                  background: `${designColor[status] || '#B11E6A'}15`,
                  color: designColor[status] || '#B11E6A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16
                }}>
                  {statusIcons[status] || <TagsOutlined />}
                </div>
                <div>
                  <Title level={4} style={{ margin: 0, lineHeight: 1, color: textColor }}>
                    {countByStatus[status]}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {status}
                  </Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb title="Operations" items={[{ label: 'Operations' }]} />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((item, index) => (
          <Col xs={12} sm={8} md={4} key={item.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card
                style={{
                  borderRadius: 12,
                  border: 'none',
                  background: `linear-gradient(135deg, ${item.color}22 0%, ${item.color}10 100%)`,
                  boxShadow: `0 4px 20px ${item.color}20`,
                  textAlign: 'center',
                }}
                styles={{ body: { padding: '16px 12px' } }}
              >
                <Title level={2} style={{ margin: 0, color: item.color }}>{item.value}</Title>
                <Text style={{ fontSize: 11, color: isDark ? '#bdbdc7' : '#666' }}>{item.label}</Text>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'orders',
            label: <Space><ToolOutlined />Order Management</Space>,
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  title={<Text strong style={{ color: textColor }}>Order Approval Queue</Text>}
                  extra={
                    <Input
                      prefix={<SearchOutlined />}
                      placeholder="Search order, hotel logo, product"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                      style={{ width: 280, borderRadius: 8 }}
                    />
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table 
                      dataSource={filteredOrders} 
                      columns={orderColumns} 
                      pagination={{ pageSize: 6, size: 'small' }} 
                      size="small" 
                      onRow={(record) => ({
                        onClick: () => navigate(`/operations/${record.id}`),
                        style: { cursor: 'pointer' }
                      })}
                    />
                  </div>
                </Card>
              </Space>
            ),
          },
          {
            key: 'design',
            label: <Space><FileImageOutlined />Designing</Space>,
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {renderQueueSummary(designQueue)}
                <Tabs
                  type="card"
                  style={{ marginTop: 8 }}
                  items={[
                    {
                      key: 'sticker_designs',
                      label: <Space><TagsOutlined />Sticker</Space>,
                      children: renderDesignTable('Sticker'),
                    },
                    {
                      key: 'box_designs',
                      label: <Space><BoxPlotOutlined />Box</Space>,
                      children: renderDesignTable('Box'),
                    },
                    {
                      key: 'ziplock_designs',
                      label: <Space><InboxOutlined />Frosted Ziplock</Space>,
                      children: renderDesignTable('Frosted Ziplock'),
                    },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: 'sticker',
            label: <Space><TagsOutlined />Sticker Printing</Space>,
            children: renderQueueCard('Sticker', productionQueues.sticker, 'Sticker Queue'),
          },
          {
            key: 'box',
            label: <Space><BoxPlotOutlined />Box</Space>,
            children: renderQueueCard('Box', productionQueues.box, 'Box Manufacturing Queue'),
          },
          {
            key: 'frosted',
            label: <Space><InboxOutlined />Frosted Ziplock</Space>,
            children: renderQueueCard('Frosted Ziplock', productionQueues.frosted, 'Frosted Ziplock Queue'),
          },
        ]}
      />

      <Modal
        title={`New ${requestType} Request`}
        open={requestOpen}
        onCancel={() => setRequestOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRequestOpen(false)}>Cancel</Button>,
          <Button key="submit" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Submit Request
          </Button>,
        ]}
        width={620}
      >
        <Form form={requestForm} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Order ID" name="orderId" rules={[{ required: true }]}>
                <Select placeholder="Select Order">
                  {operationOrders.map((order) => <Option key={order.id} value={order.id}>{order.id}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Hotel Logo" name="client" rules={[{ required: true }]}>
                <Select placeholder="Select Hotel Logo">
                  {operationOrders.map((order) => <Option key={order.hotelLogo} value={order.hotelLogo}>{order.hotelLogo}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Product" name="product">
                <Select placeholder="Select Product">
                  {operationOrders.flatMap((order) => order.items).map((item) => <Option key={item.key} value={item.product}>{item.product}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Quantity" name="qty">
                <Input placeholder="Enter quantity" suffix="units" />
              </Form.Item>
            </Col>
            {requestType === 'Sticker' && (
              <Col xs={24} sm={12}>
                <Form.Item label="Sticker Size" name="size">
                  <Input placeholder="2cm x 3cm" />
                </Form.Item>
              </Col>
            )}
            {requestType === 'Box' && (
              <>
                <Col xs={24} sm={12}>
                  <Form.Item label="Box Size" name="size">
                    <Input placeholder="10cm x 8cm x 5cm" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label="Material" name="material">
                    <Select defaultValue="PVC">
                      <Option value="PVC">PVC</Option>
                      <Option value="Paper Box">Paper Box</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
          <Form.Item label="Hotel Logo (Upload)" name="logo">
            <Upload.Dragger beforeUpload={() => false} maxCount={1} accept=".jpg,.jpeg,.png,.pdf,.ai,.svg">
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ color: '#B11E6A' }} />
              </p>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>Click or drag logo file here</p>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 0 }}>Supports: JPG, PNG, PDF, AI, SVG</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item label="Special Instructions" name="instruction">
            <Input.TextArea rows={4} placeholder="Any special instructions for design team..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${selectedQueueItem ? `${selectedQueueItem.orderId} ` : ''}Assigning`}
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAssignOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Save Assignment
          </Button>,
        ]}
      >
        <Form form={assignForm} layout="vertical">
          <Form.Item label="Order ID" name="orderId">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Product" name="product">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Assign To" name="assignee">
            <Select placeholder="Select employee">
              {operationEmployees.map((employee) => <Option key={employee.key} value={employee.name}>{employee.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Assigning Note" name="note">
            <Input.TextArea rows={3} placeholder="Assign sticker / box / ziplock work to employee" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`${selectedQueueItem ? `${selectedQueueItem.orderId} ` : ''}Verification`}
        open={verifyOpen}
        onCancel={() => setVerifyOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setVerifyOpen(false)}>Cancel</Button>,
          <Button key="verify" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>
            Verify Update
          </Button>,
        ]}
      >
        <Form form={verifyForm} layout="vertical">
          <Form.Item label="Order ID" name="orderId">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Printer Sent Qty" name="sentQty">
            <Input readOnly />
          </Form.Item>
          <Form.Item label="Verified Qty" name="verifiedQty">
            <Input />
          </Form.Item>
          <Form.Item label="Verification Note" name="note">
            <Input.TextArea rows={3} placeholder="Sticker / box / ziplock received and checked by operations" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`Design Correction: ${selectedQueueItem?.orderId}`}
        open={correctionOpen}
        onCancel={() => setCorrectionOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setCorrectionOpen(false)}>Cancel</Button>,
          <Button 
            key="save" 
            type="primary" 
            style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
            onClick={() => {
              message.success('Corrections updated');
              setCorrectionOpen(false);
            }}
          >
            Update Corrections
          </Button>,
        ]}
        width={700}
      >
        <div style={{ marginBottom: 24, padding: 16, background: mutedBg, borderRadius: 12, textAlign: 'center', border: '1px dashed #B11E6A44' }}>
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <FileImageOutlined style={{ fontSize: 48, color: '#B11E6A44' }} />
            <Text type="secondary" style={{ marginTop: 8 }}>Design Preview Placeholder</Text>
            <Text style={{ fontSize: 11, color: '#999' }}>Mark areas on the design to specify corrections</Text>
          </div>
        </div>

        <Divider orientation="left">Marked Areas & Corrections</Divider>
        
        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
          {corrections.map((item, index) => (
            <Card 
              key={index} 
              size="small" 
              style={{ marginBottom: 8, borderRadius: 8, border: '1px solid #B11E6A22' }}
              extra={<Button type="text" danger size="small" onClick={() => setCorrections(corrections.filter((_, i) => i !== index))}>Remove Area</Button>}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Tag color="magenta">Area {index + 1}</Tag>
                <Text>{item}</Text>
              </Space>
            </Card>
          ))}
          {corrections.length === 0 && <Text type="secondary">No corrections marked yet.</Text>}
        </div>

        <Form layout="vertical" onFinish={(values) => {
          if (values.newCorrection) {
            setCorrections([...corrections, values.newCorrection]);
            correctionForm.resetFields();
          }
        }} form={correctionForm}>
          <Form.Item label="Add New Correction / Mark Area" name="newCorrection">
            <Input.TextArea 
              rows={2} 
              placeholder="Describe the change needed (e.g., 'Increase logo size', 'Change font to Roboto')" 
            />
          </Form.Item>
          <Button type="dashed" block icon={<PlusOutlined />} onClick={() => correctionForm.submit()}>
            Add Correction Area
          </Button>
        </Form>
      </Modal>
      <Modal
        title={`Dispatch Material: ${selectedQueueItem?.orderId}`}
        open={dispatchOpen}
        onCancel={() => setDispatchOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDispatchOpen(false)}>Cancel</Button>,
          <Button 
            key="dispatch" 
            type="primary" 
            style={{ background: 'linear-gradient(135deg,#1677ff,#4096ff)', border: 'none' }}
            onClick={() => {
              const vals = dispatchForm.getFieldsValue();
              setSelectedQueueItem(prev => ({ ...prev, dispatchDate: vals.dispatchDate, dispatchTime: vals.dispatchTime }));
              message.success(`Dispatched to Operations at ${vals.dispatchTime}`);
              setDispatchOpen(false);
            }}
          >
            Confirm Dispatch
          </Button>,
        ]}
      >
        <Form form={dispatchForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Dispatch Date" name="dispatchDate">
                <Input readOnly />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Dispatch Time" name="dispatchTime">
                <Input readOnly />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary" style={{ fontSize: 12 }}>* Notifying operation team about the dispatch...</Text>
        </Form>
      </Modal>

      <Modal
        title={`Receive Material: ${selectedQueueItem?.orderId}`}
        open={receiveOpen}
        onCancel={() => setReceiveOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setReceiveOpen(false)}>Cancel</Button>,
          <Button 
            key="receive" 
            type="primary" 
            style={{ background: 'linear-gradient(135deg,#faad14,#ffc53d)', border: 'none' }}
            onClick={() => {
              const vals = receiveForm.getFieldsValue();
              setSelectedQueueItem(prev => ({ ...prev, arrivalDate: vals.arrivalDate }));
              message.success(`Stock Received with Arrival Date: ${vals.arrivalDate}`);
              setReceiveOpen(false);
            }}
          >
            Mark as Received
          </Button>,
        ]}
      >
        <Form form={receiveForm} layout="vertical">
          <Form.Item label="Arrival Date" name="arrivalDate">
            <Input placeholder="DD/MM/YYYY" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>* Stock will be updated with "Received" status.</Text>
        </Form>
      </Modal>
    </div>
  );
}
