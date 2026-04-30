import React, { useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Modal, Form, Select, Input, Typography, Space, Badge, Avatar, Progress } from 'antd';
import { PlusOutlined, CheckOutlined, UserOutlined, ClockCircleOutlined, SearchOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const initialTasks = [
  { key: 1, id: 'TSK-101', type: 'Production', title: 'Produce Soap Batch - ORD-2401', orderId: 'ORD-2401', client: 'Hotel Blue Star', address: 'Coimbatore, TN', salesPerson: 'Priya', createdAt: '2024-01-20T10:00:00Z', assignee: 'Ramesh K', priority: 'High', status: 'In Progress', startTime: '2024-01-21T09:00:00Z', due: '2024-01-22' },
  { key: 2, id: 'TSK-102', type: 'Sticker Work', title: 'Apply stickers - ORD-2402', orderId: 'ORD-2402', client: 'Marriott Mumbai', address: 'Mumbai, MH', salesPerson: 'Arun', createdAt: '2024-01-21T11:30:00Z', assignee: 'Kavitha S', priority: 'Medium', status: 'Pending', due: '2024-01-23' },
  { key: 3, id: 'TSK-103', type: 'Packing', title: 'Pack dental kits - ORD-2403', orderId: 'ORD-2403', client: 'Taj Hotels Delhi', address: 'Delhi, DL', salesPerson: 'Priya', createdAt: '2024-01-22T14:15:00Z', assignee: 'Meena D', priority: 'High', status: 'Completed', startTime: '2024-01-23T10:00:00Z', endTime: '2024-01-23T15:30:00Z', due: '2024-01-20' },
  { key: 4, id: 'TSK-104', type: 'Procurement', title: 'Buy Soap Base 500kg', orderId: '', client: '', address: 'Internal', salesPerson: 'N/A', createdAt: '2024-01-20T09:00:00Z', assignee: 'Suresh T', priority: 'Urgent', status: 'In Progress', startTime: '2024-01-20T10:30:00Z', due: '2024-01-21' },
  { key: 5, id: 'TSK-105', type: 'Internal', title: 'Quality Check - Batch B-22', orderId: '', client: '', address: 'Internal', salesPerson: 'N/A', createdAt: '2024-01-22T10:00:00Z', assignee: 'Ramesh K', priority: 'Low', status: 'Pending', due: '2024-01-24' },
];

const typeColor = { Production: '#B11E6A', 'Sticker Work': '#8a1652', Packing: '#C94F8A', Procurement: '#D85C9E', Internal: '#6b1240' };
const priorityColor = { Urgent: '#6b1240', High: '#B11E6A', Medium: '#C94F8A', Low: '#D85C9E' };
const statusColor = { 'In Progress': '#B11E6A', Pending: '#C94F8A', Completed: '#6b1240' };

const kanbanCols = [
  { key: 'Pending', label: 'Pending', color: '#C94F8A' },
  { key: 'In Progress', label: 'In Progress', color: '#B11E6A' },
  { key: 'Completed', label: 'Completed', color: '#6b1240' },
];

export default function Tasks() {
  const isDark = useSelector((s) => s.theme.isDark);
  const [taskList, setTaskList] = useState(initialTasks);
  const [searchText, setSearchText] = useState('');
  const [view, setView] = useState('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const handleStartTask = (taskId) => {
    setTaskList(prev => prev.map(t => t.id === taskId ? { ...t, status: 'In Progress', startTime: new Date().toISOString() } : t));
  };

  const handleCompleteTask = (taskId) => {
    setTaskList(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Completed', endTime: new Date().toISOString() } : t));
  };

  const columns = [
    { title: 'Task ID', dataIndex: 'id', render: (v) => <Text strong style={{ color: '#B11E6A' }}>{v}</Text> },
    { title: 'Type', dataIndex: 'type', render: (v) => <Tag color={typeColor[v]} style={{ borderRadius: 20 }}>{v}</Tag> },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Location', dataIndex: 'address', responsive: ['md'] },
    { title: 'Created Date', dataIndex: 'createdAt', responsive: ['md'], render: (v) => v ? new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—' },
    { title: 'Sales Person', dataIndex: 'salesPerson', responsive: ['lg'] },
    { title: 'Assignee', dataIndex: 'assignee', responsive: ['md'], render: (v) => <Space><Avatar size={24} icon={<UserOutlined />} style={{ background: '#B11E6A' }} />{v}</Space> },
    { title: 'Priority', dataIndex: 'priority', responsive: ['sm'], render: (v) => <Tag color={priorityColor[v]}>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', render: (v) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: 'Due', dataIndex: 'due', responsive: ['lg'] },
    {
      title: 'Action', key: 'action',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          {r.status === 'Pending' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartTask(r.id)} style={{ background: '#1890ff', border: 'none' }}>Start</Button>
          )}
          {r.status === 'In Progress' && (
            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleCompleteTask(r.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Done</Button>
          )}
          {r.startTime && <Text style={{ fontSize: 11, color: '#666' }}>Started: {new Date(r.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
          {r.endTime && <Text style={{ fontSize: 11, color: '#666' }}>Ended: {new Date(r.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <PageBreadcrumb title="Task Management" items={[{ label: 'Task Management' }]} style={{ marginBottom: 0 }} />
        <Space wrap>
          <Input 
            prefix={<SearchOutlined />} 
            placeholder="Search tasks..." 
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)} 
            allowClear
            style={{ width: 200, borderRadius: 8 }}
          />
          <Button.Group>
            <Button type={view === 'table' ? 'primary' : 'default'} onClick={() => setView('table')} style={view === 'table' ? { background: '#B11E6A', border: 'none' } : {}}>Table</Button>
            <Button type={view === 'kanban' ? 'primary' : 'default'} onClick={() => setView('kanban')} style={view === 'kanban' ? { background: '#B11E6A', border: 'none' } : {}}>Kanban</Button>
          </Button.Group>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>New Task</Button>
        </Space>
      </div>

      {/* Summary */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {kanbanCols.map((col) => {
          const count = taskList.filter((t) => t.status === col.key).length;
          return (
            <Col xs={8} key={col.key}>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <Card style={{ borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${col.color}25 0%, ${col.color}10 100%)`, boxShadow: `0 4px 20px ${col.color}20`, textAlign: 'center' }} styles={{ body: { padding: '16px 8px' } }}>
                  <Title level={3} style={{ margin: 0, color: col.color }}>{count}</Title>
                  <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{col.label}</Text>
                </Card>
              </motion.div>
            </Col>
          );
        })}
      </Row>

      {view === 'table' ? (
        <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
          <div className="table-responsive" style={{ padding: '4px' }}>
            <Table 
              dataSource={taskList.filter(t => !searchText || t.id.toLowerCase().includes(searchText.toLowerCase()) || t.title.toLowerCase().includes(searchText.toLowerCase()) || (t.client && t.client.toLowerCase().includes(searchText.toLowerCase())) || (t.address && t.address.toLowerCase().includes(searchText.toLowerCase())))} 
              columns={columns} 
              pagination={{ pageSize: 8, size: 'small' }} 
              size="small" 
            />
          </div>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {kanbanCols.map((col) => (
            <Col xs={24} md={8} key={col.key}>
              <Card
                title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} /><Text strong>{col.label}</Text><Badge count={taskList.filter((t) => t.status === col.key).length} style={{ background: col.color }} /></div>}
                style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', minHeight: 400 }}
                styles={{ body: { padding: '8px' } }}
              >
                {taskList.filter(t => t.status === col.key && (!searchText || t.id.toLowerCase().includes(searchText.toLowerCase()) || t.title.toLowerCase().includes(searchText.toLowerCase()) || (t.client && t.client.toLowerCase().includes(searchText.toLowerCase())) || (t.address && t.address.toLowerCase().includes(searchText.toLowerCase())))).map((task) => (
                  <motion.div key={task.id} whileHover={{ y: -2 }}>
                    <Card size="small" style={{ marginBottom: 10, borderRadius: 10, border: `1px solid ${col.color}20` }} styles={{ body: { padding: '10px 12px' } }}>
                      <Tag color={typeColor[task.type]} style={{ marginBottom: 6, borderRadius: 20, fontSize: 11 }}>{task.type}</Tag>
                      <Text strong style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>{task.title}</Text>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Space size={4}><Avatar size={20} icon={<UserOutlined />} style={{ background: '#B11E6A' }} /><Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#666' }}>{task.assignee}</Text></Space>
                        <Tag color={priorityColor[task.priority]} style={{ margin: 0, fontSize: 11 }}>{task.priority}</Tag>
                      </div>
                      <Space direction="vertical" size={2} style={{ width: '100%', marginTop: 8 }}>
                        {task.status === 'Pending' && (
                          <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStartTask(task.id)} style={{ background: '#1890ff', border: 'none', width: '100%' }}>Start</Button>
                        )}
                        {task.status === 'In Progress' && (
                          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleCompleteTask(task.id)} style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', width: '100%' }}>Done</Button>
                        )}
                        {task.startTime && <Text style={{ fontSize: 11, color: '#666', display: 'block', textAlign: 'center' }}>Started: {new Date(task.startTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
                        {task.endTime && <Text style={{ fontSize: 11, color: '#666', display: 'block', textAlign: 'center' }}>Ended: {new Date(task.endTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Text>}
                      </Space>
                    </Card>
                  </motion.div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title="Create New Task" open={modalOpen} onCancel={() => setModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancel</Button>,
          <Button key="save" type="primary" style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}>Create Task</Button>,
        ]}
        width={Math.min(520, window.innerWidth - 32)}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Task Type" name="type" rules={[{ required: true }]}>
                <Select>
                  {Object.keys(typeColor).map((t) => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Priority" name="priority" rules={[{ required: true }]}>
                <Select>
                  {Object.keys(priorityColor).map((p) => <Option key={p} value={p}>{p}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24}><Form.Item label="Task Title" name="title" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Related Order" name="orderId">
                <Select placeholder="Select Order" allowClear>
                  {['ORD-2401', 'ORD-2402', 'ORD-2403', 'ORD-2404', 'ORD-2406'].map((o) => <Option key={o} value={o}>{o}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Client Name" name="client">
                <Select placeholder="Select Client/Hotel" allowClear>
                  {['Hotel Blue Star', 'Marriott Mumbai', 'Taj Hotels Delhi', 'ITC Grand', 'Hyatt Chennai'].map((c) => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Assign To" name="assignee">
                <Select>
                  {['Ramesh K', 'Kavitha S', 'Meena D', 'Suresh T'].map((e) => <Option key={e} value={e}>{e}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}><Form.Item label="Due Date" name="due"><Input type="date" /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item label="End Time" name="endTime"><Input type="time" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Description" name="desc"><Input.TextArea rows={3} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
