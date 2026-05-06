import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
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
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
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

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
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
      title: 'Order',
      dataIndex: 'id',
      render: (value) => <Text strong style={{ color: '#B11E6A' }}>{value}</Text>,
    },
    { title: 'Hotel Logo', dataIndex: 'hotelLogo' },
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
    { title: 'Order Type', dataIndex: 'orderType', responsive: ['md'] },
    {
      title: 'Sticker / Box / Ziplock',
      dataIndex: 'specsSummary',
      render: (value) => <Text style={{ fontSize: 12 }}>{value}</Text>,
    },
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

  const employeeColumns = [
    { title: 'Employee', dataIndex: 'name', render: (value) => <Text strong>{value}</Text> },
    { title: 'Role', dataIndex: 'role' },
    { title: 'Current Task', dataIndex: 'activeTask' },
    {
      title: 'Availability',
      dataIndex: 'availability',
      render: (value) => <Tag color={statusPill[value] || 'default'}>{value}</Tag>,
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
        </Space>
      ),
    },
  ];

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
      title: 'Sent',
      dataIndex: 'sent',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{value.toLocaleString()}</Text>
          <Tag color={record.verified ? 'success' : 'warning'}>
            {record.verified ? 'Verified' : 'Verification Pending'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<UserSwitchOutlined />}
            onClick={() => {
              setSelectedQueueItem(record);
              assignForm.setFieldsValue({ orderId: record.orderId, product: record.product });
              setAssignOpen(true);
            }}
          >
            Assign
          </Button>
          <Button
            size="small"
            icon={<SafetyOutlined />}
            onClick={() => {
              setSelectedQueueItem(record);
              verifyForm.setFieldsValue({ orderId: record.orderId, sentQty: record.sent, verifiedQty: record.sent });
              setVerifyOpen(true);
            }}
          >
            Verify
          </Button>
        </Space>
      ),
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
          <Space>
            <Button icon={<PlusOutlined />} onClick={() => openRequestModal(type)}>
              New {type} Request
            </Button>
            <Button icon={<UserSwitchOutlined />} onClick={() => setAssignOpen(true)}>
              Assigning
            </Button>
            <Button icon={<SafetyOutlined />} onClick={() => setVerifyOpen(true)}>
              Verifying
            </Button>
          </Space>
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
      <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
        {queueStatuses.map((status) => (
          <Col xs={12} md={8} xl={3} key={status}>
            <Card style={{ borderRadius: 12, border: '1px solid #B11E6A18', background: cardBg }}>
              <Title level={5} style={{ margin: 0, color: '#B11E6A' }}>{countByStatus[status]}</Title>
              <Text style={{ fontSize: 11 }}>{status}</Text>
            </Card>
          </Col>
        ))}
      </Row>
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
                    <Table dataSource={filteredOrders} columns={orderColumns} pagination={{ pageSize: 6, size: 'small' }} size="small" />
                  </div>
                </Card>
                <Card
                  title={<Space><TeamOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>Employee List And Availability</Text></Space>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table dataSource={operationEmployees} columns={employeeColumns} pagination={false} size="small" />
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
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card
                      title={<Space><KeyOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>Designer Credentials</Text></Space>}
                      style={{ borderRadius: 14, border: '1px solid #B11E6A22', background: cardBg, height: '100%' }}
                    >
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <Descriptions size="small" column={1} bordered>
                          <Descriptions.Item label={<Space><LockOutlined />Login</Space>}>{designerCredentials.username}</Descriptions.Item>
                          <Descriptions.Item label="Password">{'•'.repeat(12)} (ask ops lead)</Descriptions.Item>
                          <Descriptions.Item label="Access">{designerCredentials.portal}</Descriptions.Item>
                        </Descriptions>
                        <Button
                          icon={<CopyOutlined />}
                          size="small"
                          onClick={() => {
                            navigator.clipboard.writeText(`Login: ${designerCredentials.username}\nPassword: ${designerCredentials.password}`);
                            message.success('Credentials copied');
                          }}
                        >
                          Copy Credentials
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} md={14}>
                    <Card
                      title={<Text strong style={{ color: textColor }}>Design Workflow</Text>}
                      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}
                    >
                      <Steps
                        direction="vertical"
                        size="small"
                        items={[
                          { title: 'Receive product specs from order' },
                          { title: 'Send specs and logo PDF to design team' },
                          { title: 'Design team creates sticker / box / ziplock artwork' },
                          { title: 'Send design to client via WhatsApp and sales person' },
                          { title: 'Client approves or requests correction' },
                          { title: 'Start printing / manufacturing after approval' },
                          { title: 'Printer delivers stock to operations for verification' },
                        ]}
                      />
                    </Card>
                  </Col>
                </Row>
                <Card
                  title={<Text strong style={{ color: textColor }}>Designing Queue</Text>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table dataSource={designQueue} columns={designColumns} pagination={false} size="small" />
                  </div>
                </Card>
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
    </div>
  );
}
