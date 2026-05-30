import React, { useState } from 'react';
import {
  Row, Col, Card, Form, Input, Button, Typography, Tabs, Tag, Table,
  Select, Modal, Space, Tooltip
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  ArrowLeftOutlined, SyncOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined,
  CheckCircleFilled, SettingFilled, LinkOutlined, DisconnectOutlined,
  ThunderboltOutlined, MessageOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#B11E6A';
const PRIMARY_GRAD = 'linear-gradient(90deg,#8e1450,#B11E6A)';
const PRIMARY_ALPHA = (a) => `rgba(177,30,106,${a})`;

const initTemplates = [
  { key: 1, name: 'order_confirmation', components: 'Header, Body, Footer', language: 'en', category: 'UTILITY', status: 'APPROVED', mappedEvents: 'Order Placed', lastSynced: '5/13/2026, 1:35 PM' },
  { key: 2, name: 'order_shipped', components: 'Body, Footer', language: 'en', category: 'UTILITY', status: 'APPROVED', mappedEvents: 'Order Shipped', lastSynced: '5/13/2026, 1:35 PM' },
  { key: 3, name: 'payment_reminder', components: 'Body', language: 'en', category: 'UTILITY', status: 'APPROVED', mappedEvents: 'Payment Due', lastSynced: '5/13/2026, 1:35 PM' },
  { key: 4, name: 'delivery_update', components: 'Header, Body', language: 'en', category: 'UTILITY', status: 'PENDING', mappedEvents: '—', lastSynced: '5/13/2026, 1:35 PM' },
  { key: 5, name: 'welcome_message', components: 'Body, Buttons', language: 'en', category: 'MARKETING', status: 'APPROVED', mappedEvents: 'New Customer', lastSynced: '5/13/2026, 1:35 PM' },
  { key: 6, name: 'low_stock_alert', components: 'Body', language: 'en', category: 'UTILITY', status: 'APPROVED', mappedEvents: '—', lastSynced: '5/13/2026, 1:35 PM' },
];

const initMappings = [
  { key: 1, eventType: 'Order Placed', template: 'order_confirmation', variablesMapped: 3, status: 'Active' },
  { key: 2, eventType: 'Order Shipped', template: 'order_shipped', variablesMapped: 2, status: 'Active' },
  { key: 3, eventType: 'Payment Due', template: 'payment_reminder', variablesMapped: 2, status: 'Active' },
  { key: 4, eventType: 'New Customer', template: 'welcome_message', variablesMapped: 1, status: 'Inactive' },
];

const EVENT_TYPES = ['Order Placed', 'Order Shipped', 'Order Delivered', 'Payment Due', 'Payment Received', 'New Customer', 'Low Stock Alert', 'Dispatch Update'];

export default function WhatsAppIntegration() {
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const pageBg = isDark ? '#13131f' : '#f8f5f9';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';
  const inputBg = isDark ? '#2a2a3a' : '#fafafa';

  const [connected] = useState(true);
  const [configured] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [backendUrl, setBackendUrl] = useState('https://backend.healandglow.io');
  const [apiKey, setApiKey] = useState('••••••••••••');
  const [templates, setTemplates] = useState(initTemplates);
  const [mappings, setMappings] = useState(initMappings);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editMapping, setEditMapping] = useState(null);
  const [mappingForm] = Form.useForm();
  const [configForm] = Form.useForm();

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => { setSyncing(false); enqueueSnackbar('Templates synced successfully!', { variant: 'success' }); }, 2000);
  };

  const handleTestConnection = () => {
    enqueueSnackbar('Testing connection...', { variant: 'info' });
    setTimeout(() => enqueueSnackbar('Connection successful!', { variant: 'success' }), 1500);
  };

  const handleDisconnect = () => {
    Modal.confirm({
      title: 'Disconnect WhatsApp Integration?',
      content: 'This will remove all saved credentials. You will need to reconnect to use WhatsApp features.',
      okText: 'Disconnect',
      okButtonProps: { danger: true },
      onOk: () => enqueueSnackbar('Disconnected successfully', { variant: 'success' }),
    });
  };

  const openMappingModal = (record = null) => {
    setEditMapping(record);
    mappingForm.resetFields();
    if (record) mappingForm.setFieldsValue({ eventType: record.eventType, template: record.template, status: record.status });
    setMappingModalOpen(true);
  };

  const saveMappingModal = () => {
    mappingForm.validateFields().then((vals) => {
      if (editMapping) {
        setMappings((prev) => prev.map((m) => m.key === editMapping.key ? { ...m, ...vals, variablesMapped: 2 } : m));
      } else {
        setMappings((prev) => [...prev, { key: Date.now(), ...vals, variablesMapped: 0 }]);
      }
      setMappingModalOpen(false);
      enqueueSnackbar('Mapping saved!', { variant: 'success' });
    });
  };

  const templateColumns = [
    { title: 'Template Name', dataIndex: 'name', key: 'name', render: (v) => <Text style={{ color: PRIMARY, fontWeight: 500 }}>{v}</Text> },
    { title: 'Components', dataIndex: 'components', key: 'components', render: (v) => <Text style={{ color: textColor, fontSize: 13 }}>{v}</Text> },
    { title: 'Language', dataIndex: 'language', key: 'language', width: 90, render: (v) => <Tag>{v}</Tag> },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 110, render: (v) => <Tag style={{ color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (v) => <Tag color={v === 'APPROVED' ? 'success' : 'warning'}>{v}</Tag> },
    { title: 'Mapped Events', dataIndex: 'mappedEvents', key: 'mappedEvents', render: (v) => <Text style={{ color: v === '—' ? subText : PRIMARY }}>{v}</Text> },
    {
      title: 'Actions', key: 'actions', width: 80,
      render: (_, r) => (
        <Space>
          <Tooltip title="View"><Button type="text" size="small" icon={<EyeOutlined />} style={{ color: PRIMARY }} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" icon={<DeleteOutlined />} danger /></Tooltip>
        </Space>
      ),
    },
    { title: 'Last Synced', dataIndex: 'lastSynced', key: 'lastSynced', render: (v) => <Text style={{ color: subText, fontSize: 12 }}>{v}</Text> },
  ];

  const mappingColumns = [
    { title: 'Event Type', dataIndex: 'eventType', key: 'eventType', render: (v) => <Text style={{ color: textColor, fontWeight: 500 }}>{v}</Text> },
    { title: 'Template', dataIndex: 'template', key: 'template', render: (v) => <Tag style={{ color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>{v}</Tag> },
    { title: 'Variables Mapped', dataIndex: 'variablesMapped', key: 'variablesMapped', width: 150, render: (v) => <Text style={{ color: textColor }}>{v} variable{v !== 1 ? 's' : ''}</Text> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (v) => <Tag color={v === 'Active' ? 'success' : 'default'}>{v}</Tag> },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit"><Button type="text" size="small" icon={<EditOutlined />} style={{ color: PRIMARY }} onClick={() => openMappingModal(r)} /></Tooltip>
          <Tooltip title="Delete"><Button type="text" size="small" icon={<DeleteOutlined />} danger onClick={() => setMappings((p) => p.filter((m) => m.key !== r.key))} /></Tooltip>
        </Space>
      ),
    },
  ];

  const sectionCard = (children, extra) => (
    <Card
      extra={extra}
      style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14 }}
      bodyStyle={{ padding: '24px 28px' }}
    >
      {children}
    </Card>
  );

  const tabItems = [
    {
      key: 'config',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SettingFilled /> Configuration</span>,
      children: sectionCard(
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <MessageOutlined style={{ color: PRIMARY, fontSize: 20 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>WhatsApp Configuration</Title>
          </div>

          <Form layout="vertical" form={configForm} disabled={!editing && configured}>
            <Form.Item
              label={<Text style={{ color: textColor, fontWeight: 500 }}>Backend URL <Text style={{ color: '#ff4d4f' }}>*</Text></Text>}
              style={{ marginBottom: 20 }}
            >
              <Input
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://backend.healandglow.io"
                style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 8, height: 42 }}
              />
            </Form.Item>

            <Form.Item
              label={<Text style={{ color: textColor, fontWeight: 500 }}>API Key / Access Token <Text style={{ color: '#ff4d4f' }}>*</Text></Text>}
              style={{ marginBottom: 28 }}
            >
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                suffix={
                  <Button type="text" size="small" icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setShowKey(!showKey)} style={{ color: subText }} />
                }
                style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 8, height: 42 }}
              />
            </Form.Item>
          </Form>

          <Space wrap>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleTestConnection}
              style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8, height: 38 }}
            >
              Test Connection
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditing(!editing)}
              style={{ borderRadius: 8, height: 38, borderColor: PRIMARY, color: PRIMARY }}
            >
              {editing ? 'Save Configuration' : 'Edit Configuration'}
            </Button>
            <Button danger icon={<DisconnectOutlined />} onClick={handleDisconnect} style={{ borderRadius: 8, height: 38 }}>
              Disconnect
            </Button>
          </Space>

          <div style={{ marginTop: 24, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <Text style={{ color: subText, fontSize: 13 }}>All sensitive data is encrypted. Disconnect removes saved config so you can enter new credentials.</Text>
          </div>
        </>
      ),
    },
    {
      key: 'templates',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageOutlined /> Templates</span>,
      children: sectionCard(
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <MessageOutlined style={{ color: PRIMARY, fontSize: 20 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>WhatsApp Templates</Title>
          </div>
          <Text style={{ color: subText, display: 'block', marginBottom: 16 }}>
            Manage and sync message templates from your Heal & Glow / WhatsApp account.
          </Text>
          {!syncing && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: PRIMARY_ALPHA(0.06), border: `1px solid ${PRIMARY_ALPHA(0.18)}`, borderRadius: 8 }}>
              <Text style={{ color: PRIMARY, fontSize: 13 }}>Last synced: 5/13/2026, 1:35:00 PM</Text>
              <br />
              <Text style={{ color: PRIMARY, fontSize: 13 }}>{templates.length} template(s) synced</Text>
            </div>
          )}
          <Table columns={templateColumns} dataSource={templates} pagination={false} scroll={{ x: 700 }} style={{ marginTop: 8 }} />
        </>,
        <Button
          type="primary"
          icon={<SyncOutlined spin={syncing} />}
          onClick={handleSync}
          style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8 }}
        >
          Sync Templates
        </Button>
      ),
    },
    {
      key: 'events',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkOutlined /> Event Mapping</span>,
      children: sectionCard(
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <LinkOutlined style={{ color: PRIMARY, fontSize: 18 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>Event Template Configuration</Title>
          </div>
          <Text style={{ color: subText, display: 'block', marginBottom: 20 }}>
            Configure templates and variable mappings for each event.
          </Text>
          <Table columns={mappingColumns} dataSource={mappings} pagination={false} scroll={{ x: 500 }} />
        </>,
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openMappingModal(null)}
          style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8 }}
        >
          Create New Mapping
        </Button>
      ),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '0 0 40px' }}>
      <div style={{ padding: '20px 24px 0' }}>
        <PageBreadcrumb items={[{ label: 'Integration' }, { label: 'WhatsApp Integration' }]} />
      </div>

      {connected && (
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            margin: '16px 24px 0', padding: '14px 20px',
            background: isDark ? PRIMARY_ALPHA(0.12) : PRIMARY_ALPHA(0.06),
            border: `1px solid ${PRIMARY_ALPHA(0.25)}`, borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <CheckCircleFilled style={{ color: PRIMARY, fontSize: 18 }} />
          <div>
            <Text style={{ color: textColor, fontWeight: 600 }}>Integration connected</Text>
            <br />
            <Text style={{ color: subText, fontSize: 13 }}>WhatsApp is connected and ready. Use the Templates tab to sync templates.</Text>
          </div>
        </motion.div>
      )}

      <div style={{ padding: '20px 24px 0' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ borderRadius: 8, marginBottom: 20, borderColor, color: textColor }}
        >
          Back
        </Button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageOutlined style={{ fontSize: 28, color: PRIMARY }} />
            <div>
              <Title level={3} style={{ color: PRIMARY, margin: 0 }}>WhatsApp Integration</Title>
              <Text style={{ color: subText }}>Configure WhatsApp messaging and webhook handling.</Text>
            </div>
          </div>
          <Space>
            {connected && (
              <Tag
                icon={<CheckCircleFilled />}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}
              >
                Connected
              </Tag>
            )}
            {configured && (
              <Tag
                icon={<CheckCircleFilled />}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}
              >
                Configured
              </Tag>
            )}
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ color: textColor }} />
      </div>

      <Modal
        title={<Text style={{ color: textColor, fontWeight: 600 }}>{editMapping ? 'Edit Mapping' : 'Create New Mapping'}</Text>}
        open={mappingModalOpen}
        onOk={saveMappingModal}
        onCancel={() => setMappingModalOpen(false)}
        okText="Save"
        okButtonProps={{ style: { background: PRIMARY_GRAD, border: 'none' } }}
        style={{ top: '20%' }}
      >
        <Form form={mappingForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="eventType" label="Event Type" rules={[{ required: true }]}>
            <Select placeholder="Select event type">
              {EVENT_TYPES.map((e) => <Option key={e} value={e}>{e}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="template" label="Template" rules={[{ required: true }]}>
            <Select placeholder="Select template">
              {templates.map((t) => <Option key={t.name} value={t.name}>{t.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="Active">
            <Select>
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
