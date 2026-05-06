import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Form,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  MessageOutlined,
  PrinterOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  canAssignTaskFromChecks,
  DESIGN_FLOW,
  designColor,
  FLOW_STAGES,
  getCheckStateMap,
  getFlowStep,
  getProgressFromChecks,
  operationEmployees,
  operationOrders,
  statusPill,
} from './data';

const { Text, Title } = Typography;
const { Option } = Select;

export default function OperationDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = useSelector((state) => state.theme.isDark);
  const [taskForm] = Form.useForm();
  const [checkStates, setCheckStates] = useState(getCheckStateMap());

  const activeTabFromQuery = useMemo(() => new URLSearchParams(location.search).get('tab') || 'overview', [location.search]);
  const [activeTab, setActiveTab] = useState(activeTabFromQuery);

  const order = operationOrders.find((item) => item.id === id);
  const assignedEmployee = operationEmployees.find((employee) => employee.name === order?.assignedEmployee);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const mutedBg = isDark ? '#161622' : '#faf8fb';
  const textColor = isDark ? '#ececf1' : '#1a1a2e';

  if (!order) {
    return (
      <div className="page-container">
        <Text type="danger" style={{ display: 'block', marginBottom: 12 }}>{`Operation order "${id}" not found.`}</Text>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations')}>
          Back to Operations
        </Button>
      </div>
    );
  }

  const checks = checkStates[order.id];
  const readyToAssign = canAssignTaskFromChecks(checks);
  const progressPercent = getProgressFromChecks(checks);

  const productColumns = [
    { title: 'Product', dataIndex: 'product' },
    { title: 'Print Type', dataIndex: 'logoType', render: (value) => <Tag color="purple">{value}</Tag> },
    { title: 'Quantity', dataIndex: 'qty', render: (value) => <Text strong>{value.toLocaleString()}</Text> },
    { title: 'Default Size', dataIndex: 'size', render: (value) => <Tag color="geekblue">{value}</Tag> },
    { title: 'Packaging', dataIndex: 'packaging' },
    { title: 'Material', dataIndex: 'material' },
    { title: 'Sample Size', dataIndex: 'sampleSize' },
    { title: 'Task', dataIndex: 'processTask' },
  ];

  const checklist = [
    ['designRequired', 'Design required based on product specs'],
    ['pdfReady', 'Logo PDF ready'],
    ['designSent', 'Design sent to design team'],
    ['clientApproved', 'Client approved after correction'],
    ['printingStarted', 'Printing / manufacturing started'],
    ['stockReceived', 'Sticker / box / ziplock stock received'],
    ['operationApproved', 'Operation team approved process start'],
    ['alertInventory', 'Bulk order preparation sent to inventory'],
    ['alertPrinter', 'Printer reminder enabled'],
    ['startBottleFilling', 'Bottle filling started before sticker receipt'],
  ];

  const onCheck = (key, checked) => {
    setCheckStates((prev) => ({
      ...prev,
      [order.id]: {
        ...prev[order.id],
        [key]: checked,
      },
    }));
  };

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/operations')}>Back</Button>
        <PageBreadcrumb
          title={`Operation: ${order.id}`}
          items={[{ label: 'Operations', link: '/operations' }, { label: order.id }]}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', height: '100%' }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{ width: 80, height: 80, borderRadius: 16, background: '#B11E6A12', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #B11E6A30' }}>
                <FileImageOutlined style={{ fontSize: 34, color: '#B11E6A' }} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Hotel Logo</Text>
                <Title level={3} style={{ margin: '4px 0 0', color: textColor }}>{order.hotelLogo}</Title>
              </div>
              <Space wrap>
                <Tag color={designColor[order.designStatus] || 'default'}>{order.designStatus}</Tag>
                <Tag color={statusPill[order.printingStatus] || 'default'}>{order.printingStatus}</Tag>
                <Tag color={statusPill[order.stockStatus] || 'default'}>{order.stockStatus}</Tag>
                <Tag color={order.taskStatus === 'Full' ? 'green' : order.taskStatus === 'Partial' ? 'orange' : 'default'}>
                  {order.taskStatus} Task
                </Tag>
              </Space>
              <Text style={{ fontSize: 12 }}>{order.operationStage}</Text>
              <Space wrap>
                <Button icon={<FilePdfOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>Logo PDF</Button>
                <Button icon={<MessageOutlined />}>Send To Customer</Button>
              </Space>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
              <Descriptions.Item label="Order ID">{order.id}</Descriptions.Item>
              <Descriptions.Item label="Order Type">{order.orderType}</Descriptions.Item>
              <Descriptions.Item label="Sales Person">{order.salesPerson}</Descriptions.Item>
              <Descriptions.Item label="Created Date">
                {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </Descriptions.Item>
              <Descriptions.Item label="Assigned Employee">{order.assignedEmployee}</Descriptions.Item>
              <Descriptions.Item label="Client Approval">{order.clientApproval}</Descriptions.Item>
              <Descriptions.Item label="Inventory Stock">{order.inventoryStock.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Order Received">{order.orderReceivedStock.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Default Calculation">{order.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Printer Sent">{order.printerSentTotal.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Printer Verification">
                <Tag color={order.printerVerified ? 'success' : 'warning'}>
                  {order.printerVerified ? 'Verified' : 'Pending'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Specs Summary">{order.specsSummary}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Operation Readiness
              </Text>
              <Progress percent={progressPercent} strokeColor="#B11E6A" status={readyToAssign ? 'success' : 'active'} />
            </div>
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginBottom: 16 }}>
        <Steps
          current={getFlowStep(order)}
          size="small"
          items={FLOW_STAGES.map((stage, i) => ({ title: stage, key: i }))}
        />
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card
                  title={
                    <Space>
                      <Text strong style={{ color: textColor }}>Product Specifications</Text>
                      <Tag color="purple" icon={<FileImageOutlined />}>{order.hotelLogo}</Tag>
                    </Space>
                  }
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="table-responsive" style={{ padding: 4 }}>
                    <Table dataSource={order.items} columns={productColumns} pagination={false} size="small" />
                  </div>
                </Card>

                <Card
                  title={<Space><TeamOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>Employee Assignment</Text></Space>}
                  style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                >
                  <Card style={{ borderRadius: 12, background: mutedBg, border: '1px solid #B11E6A22', maxWidth: 360 }}>
                    <Space direction="vertical" size={8}>
                      <Text strong>{assignedEmployee?.name || order.assignedEmployee}</Text>
                      <Text>{assignedEmployee?.role || 'Operations Staff'}</Text>
                      <Tag color={statusPill[assignedEmployee?.availability] || 'default'}>{assignedEmployee?.availability || 'Available'}</Tag>
                      <Text style={{ fontSize: 12 }}>Current Task: {assignedEmployee?.activeTask || 'Ready for assignment'}</Text>
                    </Space>
                  </Card>
                </Card>

                <Card style={{ borderRadius: 14, border: '1px solid #1677ff22', background: isDark ? '#10243b' : '#f2f8ff' }}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Text strong style={{ color: '#1677ff' }}>Operation Readiness Checklist</Text>
                    <Row gutter={[12, 12]}>
                      {checklist.map(([key, label]) => (
                        <Col xs={24} md={12} key={key}>
                          <Checkbox checked={checks[key]} onChange={(e) => onCheck(key, e.target.checked)}>
                            {label}
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Space>
                </Card>

                <Card style={{ borderRadius: 14, border: '1px solid #52c41a22', background: isDark ? '#102618' : '#f6fff6' }}>
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <Text strong style={{ color: '#389e0d' }}>Received Stock Verification</Text>
                    <Row gutter={[12, 12]}>
                      <Col xs={24} md={12}>
                        <Checkbox
                          checked={order.items.some((item) => item.logoType === 'Sticker') && checks.stockReceived}
                          onChange={(e) => onCheck('stockReceived', e.target.checked)}
                        >
                          Sticker received and checked
                        </Checkbox>
                      </Col>
                      <Col xs={24} md={12}>
                        <Checkbox
                          checked={order.items.some((item) => item.logoType === 'Box') && checks.stockReceived}
                          onChange={(e) => onCheck('stockReceived', e.target.checked)}
                        >
                          Box received and checked
                        </Checkbox>
                      </Col>
                      <Col xs={24} md={12}>
                        <Checkbox
                          checked={order.items.some((item) => item.logoType === 'Frosted Ziplock') && checks.stockReceived}
                          onChange={(e) => onCheck('stockReceived', e.target.checked)}
                        >
                          Ziplock received and checked
                        </Checkbox>
                      </Col>
                      <Col xs={24} md={12}>
                        <Checkbox
                          checked={order.items.some((item) => item.packaging.toLowerCase().includes('pouch')) && checks.stockReceived}
                          onChange={(e) => onCheck('stockReceived', e.target.checked)}
                        >
                          Pouch received and checked
                        </Checkbox>
                      </Col>
                    </Row>
                  </Space>
                </Card>
              </Space>
            ),
          },
          {
            key: 'design',
            label: 'Design Flow',
            children: (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                  <Steps
                    current={Math.max(0, DESIGN_FLOW.indexOf(order.designStatus))}
                    direction="vertical"
                    size="small"
                    items={[
                      { title: 'Order received', description: 'Operation team received order' },
                      { title: 'Sticker / box / ziplock requirement', description: 'Requirement based on product specs' },
                      { title: 'Logo PDF given', description: 'PDF option for logo shared to design team' },
                      { title: 'Quantity specification', description: 'Logo, quantity, size, sample size shared' },
                      { title: 'Customer sharing', description: 'Sent via WhatsApp or other number and sales person' },
                      { title: 'Correction and approval', description: 'Approve after client correction' },
                      { title: 'Printing / manufacturing', description: 'Sticker, box, and frosted follow same workflow' },
                    ]}
                  />
                </Card>

                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <Text strong>Customer Approval Sharing</Text>
                        <Input prefix={<MessageOutlined />} placeholder="WhatsApp / other number" />
                        <Input placeholder="Sales person contact / note" />
                        <Button style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} icon={<MessageOutlined />}>
                          Send Design
                        </Button>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <Text strong>Printer And Dispatch Verification</Text>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="Printer Sent">{order.printerSentTotal.toLocaleString()}</Descriptions.Item>
                          <Descriptions.Item label="Verification">
                            <Tag color={order.printerVerified ? 'success' : 'warning'}>
                              {order.printerVerified ? 'Verified' : 'Pending'}
                            </Tag>
                          </Descriptions.Item>
                        </Descriptions>
                        <Button icon={<PrinterOutlined />}>Raise printer reminder</Button>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </Space>
            ),
          },
          {
            key: 'tasks',
            label: 'Task Assignment',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                    <Form form={taskForm} layout="vertical">
                      <Form.Item label="Task Name" name="taskName">
                        <Input placeholder="Box filling / sticker placing / sealing" />
                      </Form.Item>
                      <Form.Item label="Task Type" name="taskType">
                        <Select placeholder="Select task">
                          <Option value="Shampoo Filling">Shampoo Filling</Option>
                          <Option value="Sticker Placing">Sticker Placing</Option>
                          <Option value="Dental Kit Sealing">Dental Kit Sealing</Option>
                          <Option value="Box Filling">Box Filling</Option>
                          <Option value="Frosted Ziplock Packing">Frosted Ziplock Packing</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="Default Order ID" name="orderId" initialValue={order.id}>
                        <Input value={order.id} readOnly />
                      </Form.Item>
                      <Form.Item label="Assign To" name="assignee" initialValue={order.assignedEmployee}>
                        <Select>
                          {operationEmployees.map((employee) => (
                            <Option key={employee.key} value={employee.name}>{employee.name}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                      <Button
                        type="primary"
                        disabled={!readyToAssign}
                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                      >
                        Create Task
                      </Button>
                    </Form>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Text strong>Inventory Summary</Text>
                      <Descriptions size="small" column={1} bordered>
                        <Descriptions.Item label="Default Calculation">{order.items.reduce((sum, item) => sum + item.qty, 0).toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="Stock">{order.inventoryStock.toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="Order Received">{order.orderReceivedStock.toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="Printer Sent">{order.printerSentTotal.toLocaleString()}</Descriptions.Item>
                        <Descriptions.Item label="Readiness">
                          <Tag color={readyToAssign ? 'success' : 'warning'}>
                            {readyToAssign ? 'Ready for task assignment' : 'Pending checklist items'}
                          </Tag>
                        </Descriptions.Item>
                      </Descriptions>
                    </Space>
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />
    </div>
  );
}
