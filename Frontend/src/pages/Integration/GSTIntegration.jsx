import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Form, Input, Button, Typography, Tag,
  Space, Descriptions, Spin, Alert, Modal,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  ArrowLeftOutlined, EditOutlined, CheckCircleFilled,
  DisconnectOutlined, EyeOutlined, EyeInvisibleOutlined,
  SafetyOutlined, ThunderboltOutlined, FileProtectOutlined,
  SearchOutlined, ReloadOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetGstConfigQuery,
  useLazyGetGstCredentialsQuery,
  useUpdateGstConfigMutation,
  useDeleteGstConfigMutation,
  useTestGstConnectionMutation,
  useLazyVerifyGstinQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;

const PRIMARY       = '#B11E6A';
const PRIMARY_GRAD  = 'linear-gradient(90deg,#8e1450,#B11E6A)';
const PRIMARY_ALPHA = (a) => `rgba(177,30,106,${a})`;

const GST_FIELDS = [
  { label: 'GSTIN',             key: 'gstin',          mono: true },
  { label: 'Legal Name',        key: 'lgnm' },
  { label: 'Trade Name',        key: 'tradeNam' },
  { label: 'Status',            key: 'sts',            isStatus: true },
  { label: 'Taxpayer Type',     key: 'ctb' },
  { label: 'Registration Date', key: 'rgdt' },
  { label: 'State',             key: 'stj' },
  { label: 'e-Invoice',         key: 'einvoiceStatus' },
];

export default function GSTIntegration() {
  const navigate   = useNavigate();
  const isDark     = useSelector((s) => s.theme.isDark);

  const cardBg      = isDark ? '#1E1E2E' : '#ffffff';
  const pageBg      = isDark ? '#13131f' : '#f8f5f9';
  const textColor   = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText     = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';
  const inputBg     = isDark ? '#2a2a3a' : '#fafafa';

  // ── RTK queries ──────────────────────────────────────────────────────────
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useGetGstConfigQuery();
  const [fetchCredentials, { isFetching: fetchingKey }]       = useLazyGetGstCredentialsQuery();
  const [updateGstConfig,  { isLoading: saving }]             = useUpdateGstConfigMutation();
  const [deleteGstConfig,  { isLoading: deleting }]           = useDeleteGstConfigMutation();
  const [testGstConnection,{ isLoading: testing }]            = useTestGstConnectionMutation();
  const [verifyGstinTrigger, { isFetching: verifying }]       = useLazyVerifyGstinQuery();

  const configInfo = configData?.data || {};
  const connected  = !!configInfo.configured;   // true ONLY if a DB key is saved

  // ── Local UI state ────────────────────────────────────────────────────────
  const [editing,      setEditing]      = useState(false);
  const [showKey,      setShowKey]      = useState(false);
  const [apiKey,       setApiKey]       = useState('');

  // Verify-GSTIN section
  const [testGstin,    setTestGstin]    = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError,  setVerifyError]  = useState(null);

  // Enter edit mode immediately if no key is saved yet
  useEffect(() => {
    if (!configLoading && !connected) setEditing(true);
  }, [configLoading, connected]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Edit: open the form and pre-fill with the actual saved key
  const handleEdit = async () => {
    setEditing(true);
    setShowKey(false);
    try {
      const res = await fetchCredentials(undefined, false).unwrap();
      if (res?.data?.apiKey) setApiKey(res.data.apiKey);
    } catch {
      // Credentials fetch failed — user can type the key manually
    }
  };

  // Cancel editing without saving
  const handleCancel = () => {
    setEditing(false);
    setApiKey('');
    setShowKey(false);
  };

  // Save the API key
  const handleSave = async () => {
    if (!apiKey.trim()) {
      enqueueSnackbar('Please enter a GST API key.', { variant: 'error' });
      return;
    }
    try {
      await updateGstConfig({ apiKey: apiKey.trim() }).unwrap();
      enqueueSnackbar('GST API key saved successfully!', { variant: 'success' });
      setEditing(false);
      setApiKey('');
      setShowKey(false);
      refetchConfig();
    } catch (err) {
      const msg = err?.data?.error || err?.data || 'Failed to save API key.';
      enqueueSnackbar(typeof msg === 'string' ? msg : 'Failed to save.', { variant: 'error' });
    }
  };

  // Test with whatever key is in the input (or the saved DB key if input is empty)
  const handleTest = async () => {
    const keyToTest = apiKey.trim() || undefined;
    try {
      const res = await testGstConnection(keyToTest ? { apiKey: keyToTest } : {}).unwrap();
      enqueueSnackbar(res?.message || 'GST API connection is working!', { variant: 'success' });
    } catch (err) {
      const msg = err?.data?.error || err?.data || err?.error || 'Connection test failed. Check your API key.';
      enqueueSnackbar(typeof msg === 'string' ? msg : 'Connection test failed.', { variant: 'error' });
    }
  };

  // Disconnect: confirm → delete DB key → fully reset all state
  const handleDisconnect = () => {
    Modal.confirm({
      title: 'Disconnect GST Integration?',
      icon: <ExclamationCircleOutlined />,
      content: 'This will remove your saved API key. GSTIN auto-fill in leads will stop working until you reconnect.',
      okText: 'Disconnect',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deleteGstConfig().unwrap();
          // Reset ALL local state completely
          setApiKey('');
          setShowKey(false);
          setEditing(true);       // go straight to the "enter key" state
          setTestGstin('');
          setVerifyResult(null);
          setVerifyError(null);
          await refetchConfig();  // make the UI reflect "Not Connected" immediately
          enqueueSnackbar('GST Integration disconnected successfully.', { variant: 'success' });
        } catch {
          enqueueSnackbar('Failed to disconnect. Please try again.', { variant: 'error' });
        }
      },
    });
  };

  // Verify a GSTIN in the lookup card
  const handleVerify = async () => {
    const gstin = testGstin.trim().toUpperCase();
    if (!gstin || gstin.length !== 15) {
      enqueueSnackbar('Enter a valid 15-character GSTIN.', { variant: 'warning' });
      return;
    }
    setVerifyResult(null);
    setVerifyError(null);
    try {
      const res = await verifyGstinTrigger(gstin, false).unwrap();
      setVerifyResult(res.data || res);
    } catch (err) {
      const msg = err?.data?.error || err?.data || 'GSTIN verification failed.';
      setVerifyError(typeof msg === 'string' ? msg : 'Verification failed.');
    }
  };

  // ── Loading splash ────────────────────────────────────────────────────────
  if (configLoading) {
    return (
      <div style={{ minHeight: '100vh', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: pageBg, padding: '0 0 40px' }}>
      <div style={{ padding: '20px 24px 0' }}>
        <PageBreadcrumb items={[{ label: 'Integration' }, { label: 'GST Verification' }]} />
      </div>

      {/* Connected banner */}
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
            <Text style={{ color: textColor, fontWeight: 600 }}>GST Verification connected</Text>
            <br />
            <Text style={{ color: subText, fontSize: 13 }}>
              Key on file:&nbsp;<span style={{ fontFamily: 'monospace' }}>{configInfo.keyPreview}</span>
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

        {/* Page header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FileProtectOutlined style={{ fontSize: 28, color: PRIMARY }} />
            <div>
              <Title level={3} style={{ color: PRIMARY, margin: 0 }}>GST Verification</Title>
              <Text style={{ color: subText }}>Verify GSTIN in real-time using the gstverify.co.in API.</Text>
            </div>
          </div>
          <Space>
            <Tag style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>
              gstverify.co.in
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

        {/* ── API Key Configuration card ─────────────────────────────────── */}
        <Card
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, marginBottom: 20 }}
          bodyStyle={{ padding: '24px 28px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <FileProtectOutlined style={{ color: PRIMARY, fontSize: 20 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>API Configuration</Title>
          </div>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={16}>
              <Form layout="vertical">
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
                        ? configInfo.keyPreview || 'gstv_...'
                        : 'gstv_xxxxxxxxxxxxxxxx'
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
                    style={{
                      background: inputBg,
                      border: `1px solid ${borderColor}`,
                      color: textColor,
                      borderRadius: 8,
                      height: 42,
                    }}
                    onPressEnter={editing ? handleSave : undefined}
                  />

                  {/* Status text below input */}
                  {connected && !editing && (
                    <Text style={{ color: subText, fontSize: 12, marginTop: 4, display: 'block' }}>
                      Saved key:&nbsp;
                      <span style={{ fontFamily: 'monospace', color: PRIMARY }}>{configInfo.keyPreview}</span>
                      &nbsp;· Click <b>Edit API Key</b> to change.
                    </Text>
                  )}
                  {editing && fetchingKey && (
                    <Text style={{ color: subText, fontSize: 12, marginTop: 4, display: 'block' }}>
                      Loading existing key…
                    </Text>
                  )}
                </Form.Item>
              </Form>
            </Col>
          </Row>

          {/* Action buttons */}
          <Space wrap style={{ marginTop: 4 }}>
            {editing ? (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircleFilled />}
                  loading={saving}
                  onClick={handleSave}
                  style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8, height: 38 }}
                >
                  Save API Key
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
                  <Button
                    onClick={handleCancel}
                    style={{ borderRadius: 8, height: 38 }}
                  >
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
                  Edit API Key
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

          {/* Security note */}
          <div style={{
            marginTop: 24, padding: '10px 14px',
            background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa',
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <SafetyOutlined style={{ color: PRIMARY }} />
            <Text style={{ color: subText, fontSize: 13 }}>
              Your API key is stored securely in the database. All GSTIN lookups are proxied through the HNG backend — the key is never exposed to the browser.
            </Text>
          </div>
        </Card>

        {/* ── Live GSTIN Lookup card ─────────────────────────────────────── */}
        <Card
          style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 14 }}
          bodyStyle={{ padding: '24px 28px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <SearchOutlined style={{ color: PRIMARY, fontSize: 20 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>Verify GSTIN</Title>
          </div>

          {!connected && (
            <Alert
              type="warning"
              showIcon
              message="Configure your API key above before verifying GSTINs."
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
          )}

          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={16} md={12}>
              <Input
                size="large"
                placeholder="Enter GSTIN (e.g. 27AAACG2115R1ZN)"
                value={testGstin}
                onChange={(e) => {
                  setTestGstin(e.target.value.toUpperCase());
                  setVerifyResult(null);
                  setVerifyError(null);
                }}
                onPressEnter={handleVerify}
                maxLength={15}
                style={{
                  background: inputBg, border: `1px solid ${borderColor}`,
                  color: textColor, borderRadius: 8,
                  fontFamily: 'monospace', letterSpacing: 1,
                }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Button
                type="primary"
                size="large"
                icon={verifying ? <ReloadOutlined spin /> : <SearchOutlined />}
                loading={verifying}
                onClick={handleVerify}
                disabled={!connected}
                style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8, height: 40, width: '100%' }}
              >
                {verifying ? 'Verifying…' : 'Verify GSTIN'}
              </Button>
            </Col>
          </Row>

          {verifyError && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 16 }}>
              <Alert type="error" showIcon message={verifyError} style={{ borderRadius: 8 }} />
            </motion.div>
          )}

          {verifyResult && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
              <div style={{
                padding: '16px 20px',
                background: isDark ? PRIMARY_ALPHA(0.08) : PRIMARY_ALPHA(0.04),
                border: `1px solid ${PRIMARY_ALPHA(0.2)}`, borderRadius: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
                  <Text style={{ color: textColor, fontWeight: 600 }}>GST Details</Text>
                  {verifyResult.sts && (
                    <Tag
                      color={verifyResult.sts === 'Active' ? 'success' : 'error'}
                      style={{ borderRadius: 12 }}
                    >
                      {verifyResult.sts}
                    </Tag>
                  )}
                </div>

                <Descriptions
                  column={{ xs: 1, sm: 2 }}
                  size="small"
                  labelStyle={{ color: subText, fontSize: 12, width: 160 }}
                  contentStyle={{ color: textColor, fontWeight: 500, fontSize: 13 }}
                  bordered={false}
                >
                  {GST_FIELDS.map((f) => {
                    const val = verifyResult[f.key];
                    if (!val) return null;
                    return (
                      <Descriptions.Item key={f.key} label={f.label}>
                        {f.isStatus ? (
                          <Tag color={val === 'Active' ? 'success' : 'error'} style={{ borderRadius: 10 }}>{val}</Tag>
                        ) : (
                          <span style={f.mono ? { fontFamily: 'monospace', color: PRIMARY } : {}}>{val}</span>
                        )}
                      </Descriptions.Item>
                    );
                  })}
                </Descriptions>

                {verifyResult.address && typeof verifyResult.address === 'object' && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${borderColor}` }}>
                    <Text style={{ color: subText, fontSize: 12, display: 'block', marginBottom: 6 }}>
                      Registered Address
                    </Text>
                    <Text style={{ color: textColor, fontSize: 13 }}>
                      {[
                        verifyResult.address.bnm  || verifyResult.address.building,
                        verifyResult.address.bno  || verifyResult.address.door,
                        verifyResult.address.flno || verifyResult.address.floor,
                        verifyResult.address.st   || verifyResult.address.street,
                        verifyResult.address.loc  || verifyResult.address.location,
                        verifyResult.address.dst  || verifyResult.address.district,
                        verifyResult.address.stcd || verifyResult.address.state,
                        verifyResult.address.pncd || verifyResult.address.pincode,
                      ].filter(Boolean).join(', ')}
                    </Text>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </Card>
      </div>
    </div>
  );
}
