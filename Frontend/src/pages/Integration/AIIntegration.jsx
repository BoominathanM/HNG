import { useState, useEffect } from 'react';
import {
  Row, Col, Card, Form, Input, Button, Typography, Tag,
  AutoComplete, Space, Spin, Modal, Alert,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  ArrowLeftOutlined, ThunderboltOutlined, EditOutlined, ReloadOutlined,
  CheckCircleFilled, RobotOutlined, DisconnectOutlined,
  EyeOutlined, EyeInvisibleOutlined, SafetyOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetAiConfigQuery,
  useLazyGetAiCredentialsQuery,
  useUpdateAiConfigMutation,
  useDeleteAiConfigMutation,
  useTestAiConnectionMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;

const PRIMARY = '#B11E6A';
const PRIMARY_GRAD = 'linear-gradient(90deg,#8e1450,#B11E6A)';
const PRIMARY_ALPHA = (a) => `rgba(177,30,106,${a})`;

// Free-text entry is also allowed (Select is a combobox) — this list is just a
// starting point since OpenAI ships new model ids faster than this file gets edited.
const OPENAI_MODELS = [
  { value: 'gpt-5.5', label: 'GPT-5.5 (Recommended)' },
  { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
  { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (fastest/cheapest)' },
  { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol (most capable)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
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

  // ── RTK queries ──────────────────────────────────────────────────────────
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useGetAiConfigQuery();
  const [fetchCredentials, { isFetching: fetchingKey }] = useLazyGetAiCredentialsQuery();
  const [updateAiConfig, { isLoading: saving }] = useUpdateAiConfigMutation();
  const [deleteAiConfig, { isLoading: deleting }] = useDeleteAiConfigMutation();
  const [testAiConnection, { isLoading: testing }] = useTestAiConnectionMutation();

  const configInfo = configData?.data || {};
  const connected = !!configInfo.configured; // true ONLY if a DB key is saved

  // ── Local UI state ──────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-5.5');
  // While not editing, the field just mirrors the saved config (no local-state
  // sync needed); once editing starts, handleEdit/handleCancel seed `model`
  // and further changes come from the user directly.
  const displayModel = editing ? model : (configInfo.model || model);

  // Enter edit mode immediately if no key is saved yet
  useEffect(() => {
    if (!configLoading && !connected) setEditing(true);
  }, [configLoading, connected]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleEdit = async () => {
    setEditing(true);
    setShowKey(false);
    try {
      const res = await fetchCredentials(undefined, false).unwrap();
      if (res?.data?.apiKey) setApiKey(res.data.apiKey);
      if (res?.data?.model) setModel(res.data.model);
    } catch {
      // Credentials fetch failed — user can type the key manually
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setApiKey('');
    setShowKey(false);
    setModel(configInfo.model || 'gpt-5.5');
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      enqueueSnackbar('Please enter an OpenAI API key.', { variant: 'error' });
      return;
    }
    try {
      await updateAiConfig({ apiKey: apiKey.trim(), model }).unwrap();
      enqueueSnackbar('AI configuration saved! Run Test Connection to verify it.', { variant: 'success' });
      setEditing(false);
      setApiKey('');
      setShowKey(false);
      refetchConfig();
    } catch (err) {
      const msg = err?.data?.error || err?.data || 'Failed to save configuration.';
      enqueueSnackbar(typeof msg === 'string' ? msg : 'Failed to save.', { variant: 'error' });
    }
  };

  const handleTest = async () => {
    const keyToTest = apiKey.trim() || undefined;
    try {
      const res = await testAiConnection(keyToTest ? { apiKey: keyToTest, model } : { model }).unwrap();
      enqueueSnackbar(res?.message || 'OpenAI connection is working!', { variant: 'success' });
      refetchConfig();
    } catch (err) {
      const msg = err?.data?.error || err?.data || err?.error || 'Connection test failed. Check your API key.';
      enqueueSnackbar(typeof msg === 'string' ? msg : 'Connection test failed.', { variant: 'error' });
    }
  };

  const handleDisconnect = () => {
    Modal.confirm({
      title: 'Disconnect AI Integration?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will remove your saved OpenAI API key. AI Quotation Comparison in Purchase will stop working until you reconnect.',
      okText: 'Disconnect',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteAiConfig().unwrap();
          setApiKey('');
          setShowKey(false);
          setEditing(true);
          await refetchConfig();
          enqueueSnackbar('AI Integration disconnected successfully.', { variant: 'success' });
        } catch {
          enqueueSnackbar('Failed to disconnect. Please try again.', { variant: 'error' });
        }
      },
    });
  };

  // ── Loading splash ────────────────────────────────────────────────────────
  if (configLoading) {
    return (
      <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

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
            <Text style={{ color: textColor, fontWeight: 600 }}>OpenAI connected</Text>
            <br />
            <Text style={{ color: subText, fontSize: 13 }}>
              Key on file:&nbsp;<span style={{ fontFamily: 'monospace' }}>{configInfo.keyPreview}</span>
              &nbsp;· Model: <span style={{ fontFamily: 'monospace' }}>{configInfo.model}</span>
              {configInfo.isConnected ? '' : ' · not yet verified — run Test Connection'}
            </Text>
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
              <Text style={{ color: subText }}>Connect OpenAI to power AI Quotation Comparison in Purchase.</Text>
            </div>
          </div>
          <Space>
            <Tag style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>
              OpenAI
            </Tag>
            {connected ? (
              <Tag
                icon={<CheckCircleFilled />}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#52c41a', borderColor: '#52c41a40', background: '#52c41a10' }}
              >
                Connected
              </Tag>
            ) : (
              <Tag style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#999', borderColor: '#d9d9d9' }}>
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
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>OpenAI Configuration</Title>
          </div>

          <Form layout="vertical">
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
                    placeholder={
                      connected && !editing
                        ? configInfo.keyPreview || 'sk-...'
                        : 'sk-proj-xxxxxxxxxxxxxxxx'
                    }
                    disabled={!editing}
                    suffix={
                      editing ? (
                        <Button
                          type="text" size="small"
                          icon={showKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                          onClick={() => setShowKey((v) => !v)}
                          style={{ color: subText }}
                        />
                      ) : null
                    }
                    style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 8, height: 42 }}
                    onPressEnter={editing ? handleSave : undefined}
                  />
                  {connected && !editing && (
                    <Text style={{ color: subText, fontSize: 12, marginTop: 4, display: 'block' }}>
                      Saved key:&nbsp;
                      <span style={{ fontFamily: 'monospace', color: PRIMARY }}>{configInfo.keyPreview}</span>
                      &nbsp;· Click <b>Edit Configuration</b> to change.
                    </Text>
                  )}
                  {editing && fetchingKey && (
                    <Text style={{ color: subText, fontSize: 12, marginTop: 4, display: 'block' }}>
                      Loading existing key…
                    </Text>
                  )}
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
                  <AutoComplete
                    value={displayModel}
                    onChange={setModel}
                    options={OPENAI_MODELS}
                    style={{ width: '100%' }}
                    dropdownStyle={{ background: cardBg }}
                    disabled={!editing}
                    filterOption={(input, option) =>
                      option.value.toLowerCase().includes(input.toLowerCase()) ||
                      option.label.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    <Input
                      placeholder="gpt-5.5"
                      style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 8, height: 42 }}
                    />
                  </AutoComplete>
                  <Text style={{ color: subText, fontSize: 12, marginTop: 4, display: 'block' }}>
                    Type any model id your account has access to — this list is just a starting point.
                  </Text>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Space wrap style={{ marginTop: 8 }}>
            {editing ? (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleFilled />}
                  loading={saving}
                  onClick={handleSave}
                  style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8, height: 38 }}
                >
                  Save Configuration
                </Button>
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={testing}
                  onClick={handleTest}
                  style={{ borderRadius: 8, height: 38, borderColor: PRIMARY, color: PRIMARY }}
                >
                  Test Connection
                </Button>
                {connected && (
                  <Button onClick={handleCancel} style={{ borderRadius: 8, height: 38 }}>
                    Cancel
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={testing}
                  onClick={handleTest}
                  style={{ borderRadius: 8, height: 38, borderColor: PRIMARY, color: PRIMARY }}
                >
                  Test Connection
                </Button>
                <Button
                  icon={fetchingKey ? <ReloadOutlined spin /> : <EditOutlined />}
                  loading={fetchingKey}
                  onClick={handleEdit}
                  style={{ borderRadius: 8, height: 38 }}
                >
                  Edit Configuration
                </Button>
                <Button
                  danger
                  icon={<DisconnectOutlined />}
                  loading={deleting}
                  onClick={handleDisconnect}
                  style={{ borderRadius: 8, height: 38 }}
                >
                  Disconnect
                </Button>
              </>
            )}
          </Space>

          {configInfo.connectionError && !editing && (
            <Alert
              type="error"
              showIcon
              message={`Last test failed: ${configInfo.connectionError}`}
              style={{ marginTop: 16, borderRadius: 8 }}
            />
          )}

          <div style={{ marginTop: 24, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyOutlined style={{ color: PRIMARY }} />
            <Text style={{ color: subText, fontSize: 13 }}>
              Your API key is encrypted at rest and never sent back to the browser except when you click Edit. All AI requests (including quotation comparison in Purchase) are proxied through the HNG backend.
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
}
