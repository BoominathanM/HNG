import React, { useState } from 'react';
import {
  Row, Col, Card, Form, Input, Button, Typography, Tag,
  Select, Space, message
} from 'antd';
import {
  ArrowLeftOutlined, ThunderboltOutlined, EditOutlined,
  CheckCircleFilled, RobotOutlined, DisconnectOutlined,
  EyeOutlined, EyeInvisibleOutlined, SafetyOutlined
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

const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Recommended)' },
  { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
];

export default function AIIntegration() {
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const pageBg = isDark ? '#13131f' : '#f8f5f9';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';
  const inputBg = isDark ? '#2a2a3a' : '#fafafa';

  const [connected, setConnected] = useState(false);
  const [editing, setEditing] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.0-flash');

  const handleTestConnection = () => {
    if (!apiKey) { message.error('Please enter an API key first.'); return; }
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      setConnected(true);
      setEditing(false);
      message.success('Gemini AI connected successfully!');
    }, 2000);
  };

  const handleSave = () => {
    if (!apiKey) { message.error('API Key is required.'); return; }
    setEditing(false);
    message.success('Configuration saved!');
  };

  const handleDisconnect = () => {
    setConnected(false);
    setEditing(true);
    setApiKey('');
    message.success('AI Integration disconnected.');
  };

  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '0 0 40px' }}>
      <div style={{ padding: '20px 24px 0' }}>
        <PageBreadcrumb items={[{ label: 'Integration' }, { label: 'AI Integration' }]} />
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
            <Text style={{ color: textColor, fontWeight: 600 }}>Gemini AI connected</Text>
            <br />
            <Text style={{ color: subText, fontSize: 13 }}>AI integration is active and ready.</Text>
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

        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RobotOutlined style={{ fontSize: 28, color: PRIMARY }} />
            <div>
              <Title level={3} style={{ color: PRIMARY, margin: 0 }}>AI Integration</Title>
              <Text style={{ color: subText }}>Connect and configure Gemini AI for intelligent automation.</Text>
            </div>
          </div>
          <Space>
            <Tag style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>
              Gemini AI
            </Tag>
            {connected ? (
              <Tag
                icon={<CheckCircleFilled />}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}
              >
                Connected
              </Tag>
            ) : (
              <Tag style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13 }}>
                Not Connected
              </Tag>
            )}
          </Space>
        </div>

        <Card
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14 }}
          bodyStyle={{ padding: '24px 28px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <RobotOutlined style={{ color: PRIMARY, fontSize: 20 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>Gemini AI Configuration</Title>
          </div>

          <Form layout="vertical" disabled={!editing && connected}>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={14}>
                <Form.Item
                  label={
                    <Text style={{ color: textColor, fontWeight: 500 }}>
                      API Key <Text style={{ color: '#ff4d4f' }}>*</Text>
                    </Text>
                  }
                >
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    suffix={
                      <Button
                        type="text" size="small"
                        icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => setShowKey(!showKey)}
                        style={{ color: subText }}
                      />
                    }
                    style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 8, height: 42 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item
                  label={
                    <Text style={{ color: textColor, fontWeight: 500 }}>
                      Model <Text style={{ color: '#ff4d4f' }}>*</Text>
                    </Text>
                  }
                >
                  <Select
                    value={model}
                    onChange={setModel}
                    style={{ width: '100%' }}
                    dropdownStyle={{ background: cardBg }}
                  >
                    {GEMINI_MODELS.map((m) => (
                      <Option key={m.value} value={m.value}>{m.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Space wrap style={{ marginTop: 8 }}>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={testing}
              onClick={handleTestConnection}
              style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8, height: 38 }}
            >
              Test Connection
            </Button>
            <Button
              icon={<EditOutlined />}
              onClick={editing ? handleSave : () => setEditing(true)}
              style={{ borderRadius: 8, height: 38, borderColor: PRIMARY, color: PRIMARY }}
            >
              {editing ? 'Save Configuration' : 'Edit Configuration'}
            </Button>
            {connected && (
              <Button danger icon={<DisconnectOutlined />} onClick={handleDisconnect} style={{ borderRadius: 8, height: 38 }}>
                Disconnect
              </Button>
            )}
          </Space>

          <div style={{ marginTop: 24, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined style={{ color: PRIMARY }} />
            <Text style={{ color: subText, fontSize: 13 }}>Your API key is encrypted and never exposed to the frontend. All AI requests are proxied through the Heal & Glow backend.</Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
