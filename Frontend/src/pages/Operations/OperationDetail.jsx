import React, { useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
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
  PlusOutlined,
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
  const [taskOptions, setTaskOptions] = useState(['Packing', 'Labeling', 'Filling']);
  const [newTaskValue, setNewTaskValue] = useState('');
  const inputRef = useRef(null);

  const addTaskOption = (e) => {
    e.preventDefault();
    if (newTaskValue && !taskOptions.includes(newTaskValue)) {
      setTaskOptions([...taskOptions, newTaskValue]);
      setNewTaskValue('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

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
    { 
      title: 'Production Status', 
      key: 'prodStatus',
      render: (_, record) => {
        const type = record.logoType;
        // Simulating data check
        return (
          <Space direction="vertical" size={0}>
            <Tag color="blue" style={{ fontSize: 10 }}>Dispatched: 05/05/26</Tag>
            <Tag color="green" style={{ fontSize: 10 }}>Arrived: 06/05/26</Tag>
          </Space>
        );
      }
    },
    { title: 'Verification', key: 'verify', render: () => <Tag color="success">Verified</Tag> },
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

                <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}>
                  <Title level={5} style={{ color: textColor, marginBottom: 20 }}>Operation Workflow Manager</Title>
                  <Steps
                    direction="vertical"
                    current={checks.stockVerified ? (checks.clientApproved ? (checks.movedToOps ? 3 : 2) : 1) : 0}
                    items={[
                      {
                        title: 'Stock & Material Verification',
                        description: (
                          <Space direction="vertical" style={{ marginTop: 8, marginBottom: 24, width: '100%' }}>
                            <Text type="secondary">Compare order details and material stocks against available inventory.</Text>
                            <Table
                              dataSource={order.items}
                              columns={[
                                { title: 'Product Name', dataIndex: 'product', key: 'product' },
                                { title: 'Type', dataIndex: 'logoType', key: 'logoType', render: (val) => <Tag color="purple">{val}</Tag> },
                                { title: 'Material', dataIndex: 'material', key: 'material' },
                                { title: 'Req. Qty', dataIndex: 'qty', key: 'qty', align: 'right', render: (val) => <Text strong>{val.toLocaleString()}</Text> },
                                { title: 'Inventory Stock', key: 'inv', align: 'right', render: (_, record) => <Text style={{ color: '#389e0d' }}>{Math.floor(record.qty * 1.2).toLocaleString()}</Text> },
                                { title: 'Order Stack', key: 'stack', align: 'right', render: (_, record) => <Text type="secondary">{Math.floor(record.qty * 0.8).toLocaleString()}</Text> },
                              ]}
                              pagination={false}
                              size="small"
                              bordered
                              summary={(pageData) => {
                                let totalQty = 0;
                                let totalInv = 0;
                                let totalStack = 0;
                                pageData.forEach(({ qty }) => {
                                  totalQty += qty;
                                  totalInv += Math.floor(qty * 1.2);
                                  totalStack += Math.floor(qty * 0.8);
                                });
                                return (
                                  <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: mutedBg }}>
                                      <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total Verification</Text></Table.Summary.Cell>
                                      <Table.Summary.Cell index={1} align="right"><Text strong>{totalQty.toLocaleString()}</Text></Table.Summary.Cell>
                                      <Table.Summary.Cell index={2} align="right"><Text strong style={{ color: '#389e0d' }}>{totalInv.toLocaleString()}</Text></Table.Summary.Cell>
                                      <Table.Summary.Cell index={3} align="right"><Text strong>{totalStack.toLocaleString()}</Text></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                  </Table.Summary>
                                );
                              }}
                              style={{ maxWidth: 800 }}
                            />
                            <Checkbox 
                              checked={checks.stockVerified} 
                              onChange={(e) => onCheck('stockVerified', e.target.checked)}
                            >
                              <Text strong>Verify and Make Stocks Available</Text>
                            </Checkbox>
                          </Space>
                        ),
                      },
                      {
                        title: 'Design & Customer Approval',
                        description: (
                          <Space direction="vertical" style={{ marginTop: 8, marginBottom: 24, width: '100%' }}>
                            <Text type="secondary">Send hotel logo to design team and notify customer for verification.</Text>
                            <Space wrap>
                              <Button 
                                type="default" 
                                icon={<FileImageOutlined />} 
                                disabled={!checks.stockVerified}
                                onClick={() => onCheck('designSent', true)}
                                style={checks.designSent ? { borderColor: '#52c41a', color: '#52c41a' } : { borderColor: '#B11E6A', color: '#B11E6A' }}
                              >
                                {checks.designSent ? 'Logo Sent to Design Team' : 'Send Logo to Design Team'}
                              </Button>
                              <Checkbox 
                                checked={checks.whatsappNotify} 
                                onChange={(e) => onCheck('whatsappNotify', e.target.checked)}
                                disabled={!checks.designSent}
                              >
                                Notify Sales & Customer via WhatsApp
                              </Checkbox>
                              <Button 
                                type="primary" 
                                disabled={!checks.whatsappNotify}
                                style={{ background: checks.clientApproved ? '#52c41a' : 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                                onClick={() => onCheck('clientApproved', true)}
                              >
                                {checks.clientApproved ? 'Customer Verified' : 'Send for Verification'}
                              </Button>
                            </Space>
                          </Space>
                        ),
                      },
                      {
                        title: 'Operations Transfer & Verification',
                        description: (
                          <Space direction="vertical" style={{ marginTop: 8, marginBottom: 24, width: '100%' }}>
                            <Text type="secondary">Based on material (Ziplock/Box/Sticker), move to operations and verify received stock.</Text>
                            <Checkbox 
                              checked={checks.movedToOps} 
                              onChange={(e) => onCheck('movedToOps', e.target.checked)}
                              disabled={!checks.clientApproved}
                            >
                              <Text strong>Move to Operation Team</Text>
                            </Checkbox>
                            
                            {checks.movedToOps && (
                              <Card size="small" style={{ borderRadius: 8, border: '1px solid #52c41a22', background: isDark ? '#102618' : '#f6fff6', marginTop: 8, maxWidth: 600 }}>
                                <Text strong style={{ color: '#389e0d', display: 'block', marginBottom: 8 }}>Stocks Available Checklist</Text>
                                <Row gutter={[12, 12]}>
                                    {order.items.some((item) => item.logoType === 'Sticker') && (
                                      <Col xs={24} sm={12}>
                                        <Space>
                                          <Checkbox checked={checks.stickerReceived} onChange={(e) => onCheck('stickerReceived', e.target.checked)}>Sticker Received (Arrived)</Checkbox>
                                          <Tag color="cyan">Verified</Tag>
                                        </Space>
                                      </Col>
                                    )}
                                    {order.items.some((item) => item.logoType === 'Box') && (
                                      <Col xs={24} sm={12}>
                                        <Space>
                                          <Checkbox checked={checks.boxReceived} onChange={(e) => onCheck('boxReceived', e.target.checked)}>Box Received (Arrived)</Checkbox>
                                          <Tag color="cyan">Verified</Tag>
                                        </Space>
                                      </Col>
                                    )}
                                    {order.items.some((item) => item.logoType === 'Frosted Ziplock') && (
                                      <Col xs={24} sm={12}>
                                        <Space>
                                          <Checkbox checked={checks.ziplockReceived} onChange={(e) => onCheck('ziplockReceived', e.target.checked)}>Ziplock Received (Arrived)</Checkbox>
                                          <Tag color="cyan">Verified</Tag>
                                        </Space>
                                      </Col>
                                    )}
                                </Row>
                              </Card>
                            )}
                          </Space>
                        ),
                      },
                      {
                        title: 'Task Assignment',
                        description: (
                          <Space direction="vertical" style={{ marginTop: 8, width: '100%' }}>
                            <Text type="secondary">Assign tasks for packing, labeling, or filling to employees.</Text>
                            <Form layout="inline" style={{ marginTop: 8 }}>
                              <Form.Item label="Task">
                                <Select 
                                  placeholder="Select task" 
                                  style={{ width: 160 }} 
                                  disabled={!checks.movedToOps}
                                  dropdownRender={(menu) => (
                                    <>
                                      {menu}
                                      <Divider style={{ margin: '8px 0' }} />
                                      <Space style={{ padding: '0 8px 4px' }}>
                                        <Input
                                          placeholder="Add new task"
                                          ref={inputRef}
                                          value={newTaskValue}
                                          onChange={(e) => setNewTaskValue(e.target.value)}
                                          onKeyDown={(e) => e.stopPropagation()}
                                          style={{ width: 120 }}
                                        />
                                        <Button type="text" icon={<PlusOutlined />} onClick={addTaskOption}>
                                          Add
                                        </Button>
                                      </Space>
                                    </>
                                  )}
                                >
                                  {taskOptions.map((item) => (
                                    <Select.Option key={item} value={item.toLowerCase()}>
                                      {item}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                              <Form.Item label="Employee">
                                <Select placeholder="Select assignee" style={{ width: 160 }} disabled={!checks.movedToOps}>
                                  {operationEmployees.map(emp => <Select.Option key={emp.name} value={emp.name}>{emp.name}</Select.Option>)}
                                </Select>
                              </Form.Item>
                              <Form.Item>
                                <Button type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }} disabled={!checks.movedToOps}>
                                  Assign Task
                                </Button>
                              </Form.Item>
                            </Form>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
              </Space>
            ),
          },

          {
            key: 'tasks',
            label: 'Task Assignment',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card 
                    title={<Space><TeamOutlined style={{ color: '#B11E6A' }} /><Text strong style={{ color: textColor }}>Create Assignment Task</Text></Space>}
                    style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
                  >
                    <Form form={taskForm} layout="vertical">
                      <Row gutter={24}>
                        <Col xs={24} md={12}>
                          <Form.Item label="Task Name" name="taskName">
                            <Input placeholder="e.g. Box filling / sticker placing" style={{ borderRadius: 8 }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="Task Type" name="taskType">
                            <Select 
                              placeholder="Select or add task type" 
                              style={{ borderRadius: 8 }}
                              dropdownRender={(menu) => (
                                <>
                                  {menu}
                                  <Divider style={{ margin: '8px 0' }} />
                                  <Space style={{ padding: '0 8px 4px' }}>
                                    <Input
                                      placeholder="Add new task"
                                      ref={inputRef}
                                      value={newTaskValue}
                                      onChange={(e) => setNewTaskValue(e.target.value)}
                                      onKeyDown={(e) => e.stopPropagation()}
                                      style={{ width: 120 }}
                                    />
                                    <Button type="text" icon={<PlusOutlined />} onClick={addTaskOption}>
                                      Add
                                    </Button>
                                  </Space>
                                </>
                              )}
                            >
                              {taskOptions.map((item) => (
                                <Option key={item} value={item.toLowerCase()}>{item}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="Order ID" name="orderId" initialValue={order.id}>
                            <Input value={order.id} readOnly style={{ borderRadius: 8, background: mutedBg }} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label="Assign To" name="assignee" initialValue={order.assignedEmployee}>
                            <Select style={{ borderRadius: 8 }}>
                              {operationEmployees.map((employee) => (
                                <Option key={employee.key} value={employee.name}>{employee.name}</Option>
                              ))}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                        <Button
                          type="primary"
                          block
                          disabled={!readyToAssign}
                          style={{ 
                            height: 45,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', 
                            border: 'none',
                            fontSize: 16,
                            fontWeight: 600,
                            boxShadow: '0 4px 15px rgba(177,30,106,0.3)'
                          }}
                        >
                          Create and Assign Task
                        </Button>
                        {!readyToAssign && (
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', marginTop: 8 }}>
                            * Complete the workflow steps in Overview to enable task assignment
                          </Text>
                        )}
                      </Form.Item>
                    </Form>
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
