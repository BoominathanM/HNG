import React, { useState, useEffect } from 'react';
import {
  Row, Col, Card, Form, Input, Button, Typography, Tabs, Tag, Table,
  Select, Modal, Space, Tooltip, Spin, Empty, Popconfirm, TimePicker,
  Checkbox, InputNumber,
} from 'antd';
import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';
import {
  ArrowLeftOutlined, SyncOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined,
  CheckCircleFilled, SettingFilled, LinkOutlined, DisconnectOutlined,
  ThunderboltOutlined, MessageOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetWhatsAppConfigQuery,
  useGetWhatsAppCredentialsQuery,
  useSaveWhatsAppConfigMutation,
  useTestWhatsAppConnectionMutation,
  useDisconnectWhatsAppMutation,
  useSyncWhatsAppTemplatesMutation,
  useGetWhatsAppTemplatesQuery,
  useGetWhatsAppEventsQuery,
  useGetWhatsAppEventMappingsQuery,
  useSaveWhatsAppEventMappingMutation,
  useDeleteWhatsAppEventMappingMutation,
  useGetUsersQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#B11E6A';
const PRIMARY_GRAD = 'linear-gradient(90deg,#8e1450,#B11E6A)';
const PRIMARY_ALPHA = (a) => `rgba(177,30,106,${a})`;

// WhatsApp templates have no explicit "type" field — derive it from the HEADER
// component's format. No HEADER (or a TEXT header) means it's a plain text template.
const getTemplateType = (t) => {
  const header = Array.isArray(t?.components) ? t.components.find((c) => c?.type === 'HEADER') : null;
  return (header?.format || 'TEXT').toLowerCase();
};

// These events are date-driven reminders sent as plain scheduled messages, so only
// text templates make sense for them — other events can use any template type.
const TEXT_ONLY_TEMPLATE_EVENT_KEYS = ['follow-up-reminder', 'payment-due', 'order-delivery-reminder', 'local-purchase-credit-due'];

// Billing Invoice attaches the invoice/quotation PDF as a WhatsApp document header,
// so only templates built with a DOCUMENT header are valid choices for it.
const DOCUMENT_ONLY_TEMPLATE_EVENT_KEYS = ['billing-invoice'];

// These events escalate to a fixed list of internal recipients, repeating every
// `delayMinutes` inside a start/end time window on the configured days — instead
// of the simple once-a-day `sendTime` used by the other date-driven reminders.
const ESCALATION_EVENT_KEYS = ['local-purchase-credit-due'];

// This event sends instantly on submit (no escalation window/repeat), but still lets
// the admin pick a fixed list of internal recipients — scoped to Admin-department users
// — instead of the default fallback (every Super Admin/Admin) used when none are picked.
const RECIPIENT_ONLY_EVENT_KEYS = ['stock-checking'];

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WhatsAppIntegration() {
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const cardBg     = isDark ? '#1E1E2E' : '#ffffff';
  const pageBg     = isDark ? '#13131f' : '#f8f5f9';
  const textColor  = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText    = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';
  const inputBg    = isDark ? '#2a2a3a' : '#fafafa';

  // ── State ─────────────────────────────────────────────────────────────────
  const [editing, setEditing]             = useState(false);
  const [showKey, setShowKey]             = useState(false);
  const [backendUrl, setBackendUrl]       = useState('');
  const [apiKey, setApiKey]               = useState('');
  const [activeTab, setActiveTab]         = useState('config');
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editMapping, setEditMapping]     = useState(null);
  const [variableRows, setVariableRows]   = useState([]);
  const [sendTime, setSendTime]           = useState(dayjs('08:00', 'HH:mm'));
  const [escRecipients, setEscRecipients] = useState([]);
  const [escStartTime, setEscStartTime]   = useState(dayjs('10:00', 'HH:mm'));
  const [escEndTime, setEscEndTime]       = useState(dayjs('20:00', 'HH:mm'));
  const [escDelayMinutes, setEscDelayMinutes] = useState(30);
  const [escDays, setEscDays]             = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const [mappingForm] = Form.useForm();

  // ── RTK Queries ───────────────────────────────────────────────────────────
  const { data: configData, isLoading: configLoading } = useGetWhatsAppConfigQuery();
  const { data: credsData }  = useGetWhatsAppCredentialsQuery(undefined, { skip: !editing });
  const { data: templatesData, isLoading: templatesLoading } = useGetWhatsAppTemplatesQuery({ limit: 5000 });
  const { data: eventsData }  = useGetWhatsAppEventsQuery();
  const { data: mappingsData, isLoading: mappingsLoading } = useGetWhatsAppEventMappingsQuery();
  const { data: usersData }   = useGetUsersQuery({ limit: 1000 });

  // Recipients pool for escalation events — active users in the Finance department
  const financeUsers = (usersData?.data || []).filter((u) => u.department === 'Finance' && u.status === 'Active');
  // Recipients pool for Stock Checking — active users in the Admin/Management department,
  // plus every Super Admin regardless of their department.
  const adminUsers = (usersData?.data || []).filter((u) =>
    u.status === 'Active' && (u.department === 'Admin' || u.department === 'Management' || u.role === 'Super Admin')
  );

  // ── RTK Mutations ─────────────────────────────────────────────────────────
  const [saveConfig,           { isLoading: saving }]    = useSaveWhatsAppConfigMutation();
  const [testConnection,       { isLoading: testing }]   = useTestWhatsAppConnectionMutation();
  const [disconnectWA,         { isLoading: disconnecting }] = useDisconnectWhatsAppMutation();
  const [syncTemplates,        { isLoading: syncing }]   = useSyncWhatsAppTemplatesMutation();
  const [saveMapping,          { isLoading: savingMap }] = useSaveWhatsAppEventMappingMutation();
  const [deleteMapping,        { isLoading: deletingMap }] = useDeleteWhatsAppEventMappingMutation();

  const config     = configData?.data;
  const templates  = templatesData?.data?.templates || [];
  const events     = eventsData?.data || [];
  const mappings   = mappingsData?.data || [];
  const isConnected = Boolean(config?.isConnected);
  const isConfigured = Boolean(config?.backendUrl);

  // Pre-fill credentials when entering edit mode
  useEffect(() => {
    if (editing && credsData?.data) {
      setBackendUrl(credsData.data.backendUrl || '');
      setApiKey(credsData.data.apiToken || '');
    }
  }, [editing, credsData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveConfig = async () => {
    if (!backendUrl.trim() || !apiKey.trim()) {
      enqueueSnackbar('Backend URL and API key are required', { variant: 'warning' });
      return;
    }
    try {
      const res = await saveConfig({ backendUrl: backendUrl.trim(), apiToken: apiKey.trim() }).unwrap();
      enqueueSnackbar(res.message || 'Configuration saved', { variant: 'success' });
      setEditing(false);
    } catch (err) {
      enqueueSnackbar(err?.data || 'Failed to save configuration', { variant: 'error' });
    }
  };

  const handleTestConnection = async () => {
    const url   = editing ? backendUrl.trim() : config?.backendUrl || '';
    const token = editing ? apiKey.trim() : '';
    if (!url) { enqueueSnackbar('Enter a backend URL first', { variant: 'warning' }); return; }

    enqueueSnackbar('Testing connection…', { variant: 'info' });
    try {
      const res = await testConnection({ backendUrl: url, ...(token ? { apiToken: token } : {}) }).unwrap();
      enqueueSnackbar(
        `Connection successful — ${res.data?.templateCount ?? 0} template(s) found`,
        { variant: 'success' }
      );
    } catch (err) {
      enqueueSnackbar(err?.data || 'Connection failed', { variant: 'error' });
    }
  };

  const handleDisconnect = () => {
    Modal.confirm({
      title: 'Disconnect WhatsApp Integration?',
      icon: <ExclamationCircleOutlined />,
      content: 'This removes all saved credentials, synced templates, and event mappings. You will need to reconnect to use WhatsApp features.',
      okText: 'Disconnect',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await disconnectWA().unwrap();
          setBackendUrl('');
          setApiKey('');
          setEditing(false);
          enqueueSnackbar('WhatsApp integration disconnected', { variant: 'success' });
        } catch {
          enqueueSnackbar('Failed to disconnect', { variant: 'error' });
        }
      },
    });
  };

  const handleSync = async () => {
    try {
      const res = await syncTemplates().unwrap();
      enqueueSnackbar(`${res.data?.synced ?? 0} templates synced successfully`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data || 'Sync failed — check your configuration', { variant: 'error' });
    }
  };

  // ── Mapping Modal ─────────────────────────────────────────────────────────
  const openMappingModal = (record = null) => {
    setEditMapping(record);
    mappingForm.resetFields();
    if (record) {
      const eventId    = record.eventId?._id || record.eventId;
      const templateId = record.templateId?._id || record.templateId;
      mappingForm.setFieldsValue({ eventId, templateId, isEnabled: record.isEnabled !== false });
      setVariableRows(Array.isArray(record.variables) ? record.variables : []);
      setSendTime(record.sendTime ? dayjs(record.sendTime, 'HH:mm') : dayjs('08:00', 'HH:mm'));
      setEscRecipients((record.recipientUserIds || []).map((u) => u?._id || u));
      setEscStartTime(record.startTime ? dayjs(record.startTime, 'HH:mm') : dayjs('10:00', 'HH:mm'));
      setEscEndTime(record.endTime ? dayjs(record.endTime, 'HH:mm') : dayjs('20:00', 'HH:mm'));
      setEscDelayMinutes(record.delayMinutes || 30);
      setEscDays(record.days?.length ? record.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    } else {
      setVariableRows([]);
      setSendTime(dayjs('08:00', 'HH:mm'));
      setEscRecipients([]);
      setEscStartTime(dayjs('10:00', 'HH:mm'));
      setEscEndTime(dayjs('20:00', 'HH:mm'));
      setEscDelayMinutes(30);
      setEscDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    }
    setMappingModalOpen(true);
  };

  const handleTemplateSelect = (templateId) => {
    const tpl = templates.find((t) => String(t._id) === String(templateId));
    if (tpl?.variables?.length) {
      setVariableRows(tpl.variables.map((v) => ({ templateVariable: v, eventField: '' })));
    } else {
      setVariableRows([]);
    }
  };

  const saveMappingModal = async () => {
    try {
      const vals = await mappingForm.validateFields();
      const selectedEvt = events.find((e) => String(e._id) === String(vals.eventId));
      const isDateDriven = TEXT_ONLY_TEMPLATE_EVENT_KEYS.includes(selectedEvt?.key);
      const isEscalation = ESCALATION_EVENT_KEYS.includes(selectedEvt?.key);
      const isRecipientOnly = RECIPIENT_ONLY_EVENT_KEYS.includes(selectedEvt?.key);
      if (isEscalation && !escRecipients.length) {
        enqueueSnackbar('Select at least one recipient', { variant: 'warning' });
        return;
      }
      const payload = {
        ...(editMapping?._id ? { id: editMapping._id } : {}),
        eventId:    vals.eventId,
        templateId: vals.templateId,
        isEnabled:  vals.isEnabled !== false,
        variables:  variableRows.filter((r) => r.templateVariable && r.eventField),
        ...(isEscalation ? {
          recipientUserIds: escRecipients,
          startTime:        escStartTime?.format('HH:mm') || '10:00',
          endTime:          escEndTime?.format('HH:mm') || '20:00',
          delayMinutes:     escDelayMinutes || 30,
          days:             escDays,
        } : isRecipientOnly ? {
          // No recipients picked — leave unset so the backend falls back to notifying
          // every Super Admin/Admin, same as before this picker existed.
          recipientUserIds: escRecipients,
        } : isDateDriven ? { sendTime: sendTime?.format('HH:mm') || '08:00' } : {}),
      };
      const res = await saveMapping(payload).unwrap();
      enqueueSnackbar(res.message || 'Mapping saved', { variant: 'success' });
      setMappingModalOpen(false);
    } catch (err) {
      if (err?.data) enqueueSnackbar(err.data, { variant: 'error' });
    }
  };

  const handleDeleteMapping = async (id) => {
    try {
      await deleteMapping(id).unwrap();
      enqueueSnackbar('Mapping deleted', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to delete mapping', { variant: 'error' });
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const templateColumns = [
    {
      title: 'Template Name', dataIndex: 'name', key: 'name',
      render: (v) => <Text style={{ color: PRIMARY, fontWeight: 500 }}>{v}</Text>,
    },
    {
      title: 'Type', key: 'type', width: 100,
      render: (_, r) => {
        const type = getTemplateType(r);
        return (
          <Tag color={type === 'text' ? 'blue' : 'purple'}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Tag>
        );
      },
    },
    {
      title: 'Components', key: 'components',
      render: (_, r) => {
        const types = Array.isArray(r.components) ? r.components.map((c) => c?.type).filter(Boolean) : [];
        return <Text style={{ color: textColor, fontSize: 13 }}>{types.length ? types.join(', ') : '—'}</Text>;
      },
    },
    {
      title: 'Language', dataIndex: 'language', key: 'language', width: 90,
      render: (v) => <Tag>{v || 'en'}</Tag>,
    },
    {
      title: 'Category', dataIndex: 'category', key: 'category', width: 120,
      render: (v) => (
        <Tag style={{ color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>
          {v || 'UTILITY'}
        </Tag>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: (v) => <Tag color={v === 'APPROVED' ? 'success' : 'warning'}>{v || 'UNKNOWN'}</Tag>,
    },
    {
      title: 'Mapped Events', dataIndex: 'mappedEvents', key: 'mappedEvents',
      render: (v) => {
        const arr = Array.isArray(v) ? v : [];
        return arr.length
          ? arr.map((e) => <Tag key={e} color="processing">{e}</Tag>)
          : <Text style={{ color: subText }}>—</Text>;
      },
    },
    {
      title: 'Last Synced', dataIndex: 'lastSyncedAt', key: 'lastSyncedAt',
      render: (v) => <Text style={{ color: subText, fontSize: 12 }}>{v ? new Date(v).toLocaleString() : '—'}</Text>,
    },
  ];

  const mappingColumns = [
    {
      title: 'Event', key: 'event',
      render: (_, r) => <Text style={{ color: textColor, fontWeight: 500 }}>{r.eventId?.label || '—'}</Text>,
    },
    {
      title: 'Template', key: 'template',
      render: (_, r) => (
        <Tag style={{ color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}>
          {r.templateId?.name || '—'}
        </Tag>
      ),
    },
    {
      title: 'Variables', key: 'vars', width: 130,
      render: (_, r) => {
        const count = Array.isArray(r.variables) ? r.variables.filter((v) => v.templateVariable && v.eventField).length : 0;
        return <Text style={{ color: textColor }}>{count} variable{count !== 1 ? 's' : ''}</Text>;
      },
    },
    {
      title: 'Send Time', key: 'sendTime', width: 190,
      render: (_, r) => {
        if (ESCALATION_EVENT_KEYS.includes(r.eventId?.key)) {
          if (!r.startTime || !r.endTime) return <Text style={{ color: subText }}>Not configured</Text>;
          return (
            <Space direction="vertical" size={2}>
              <Tag color="orange">{r.startTime}–{r.endTime} every {r.delayMinutes || 30}m</Tag>
              <Text style={{ color: subText, fontSize: 11 }}>
                {(r.recipientUserIds || []).length} recipient{(r.recipientUserIds || []).length !== 1 ? 's' : ''} · {(r.days || []).join(', ') || 'All days'}
              </Text>
            </Space>
          );
        }
        if (RECIPIENT_ONLY_EVENT_KEYS.includes(r.eventId?.key)) {
          const count = (r.recipientUserIds || []).length;
          return (
            <Text style={{ color: subText, fontSize: 12 }}>
              {count ? `${count} recipient${count !== 1 ? 's' : ''} selected` : 'Fallback: Super Admin/Admin'}
            </Text>
          );
        }
        if (!TEXT_ONLY_TEMPLATE_EVENT_KEYS.includes(r.eventId?.key)) return <Text style={{ color: subText }}>—</Text>;
        const t = r.sendTime || '08:00';
        const [hh, mm] = t.split(':');
        const h = parseInt(hh, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return <Tag color="blue">{`${String(h12).padStart(2, '0')}:${mm} ${ampm}`}</Tag>;
      },
    },
    {
      title: 'Status', dataIndex: 'isEnabled', key: 'status', width: 100,
      render: (v) => <Tag color={v !== false ? 'success' : 'default'}>{v !== false ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100,
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} style={{ color: PRIMARY }} onClick={() => openMappingModal(r)} />
          </Tooltip>
          <Popconfirm
            title="Delete this mapping?"
            onConfirm={() => handleDeleteMapping(r._id)}
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" icon={<DeleteOutlined />} danger loading={deletingMap} />
            </Tooltip>
          </Popconfirm>
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

  // ── Selected event's available fields for variable mapping ────────────────
  const selectedEventId  = Form.useWatch('eventId', mappingForm);
  const selectedEvent    = events.find((e) => String(e._id) === String(selectedEventId));
  // Follow Up Reminder / Payment Reminder are date-driven daily reminders — they
  // also only ever get plain text templates; other events can use any template type.
  const isDateDrivenEvent = TEXT_ONLY_TEMPLATE_EVENT_KEYS.includes(selectedEvent?.key);
  const isDocumentOnlyEvent = DOCUMENT_ONLY_TEMPLATE_EVENT_KEYS.includes(selectedEvent?.key);
  const isEscalationEvent = ESCALATION_EVENT_KEYS.includes(selectedEvent?.key);
  const isRecipientOnlyEvent = RECIPIENT_ONLY_EVENT_KEYS.includes(selectedEvent?.key);
  const templatesForEvent = isDateDrivenEvent
    ? templates.filter((t) => getTemplateType(t) === 'text')
    : isDocumentOnlyEvent
      ? templates.filter((t) => getTemplateType(t) === 'document')
      : templates;

  const tabItems = [
    // ── Configuration Tab ──────────────────────────────────────────────────
    {
      key: 'config',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SettingFilled /> Configuration</span>,
      children: sectionCard(
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <MessageOutlined style={{ color: PRIMARY, fontSize: 20 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>WhatsApp Configuration</Title>
          </div>

          {configLoading ? (
            <Spin />
          ) : (
            <Form layout="vertical" disabled={!editing && isConfigured}>
              <Form.Item
                label={<Text style={{ color: textColor, fontWeight: 500 }}>Backend URL <Text style={{ color: '#ff4d4f' }}>*</Text></Text>}
                style={{ marginBottom: 20 }}
              >
                <Input
                  value={editing ? backendUrl : (config?.backendUrl || '')}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="https://backend.askeva.io"
                  style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 8, height: 42 }}
                />
              </Form.Item>

              <Form.Item
                label={<Text style={{ color: textColor, fontWeight: 500 }}>API Key / Access Token <Text style={{ color: '#ff4d4f' }}>*</Text></Text>}
                style={{ marginBottom: 28 }}
              >
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={editing ? apiKey : (isConfigured ? '••••••••••••••••' : '')}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
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
            </Form>
          )}

          <Space wrap>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleTestConnection}
              loading={testing}
              style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8, height: 38 }}
            >
              Test Connection
            </Button>

            {editing ? (
              <>
                <Button
                  icon={<CheckCircleFilled />}
                  onClick={handleSaveConfig}
                  loading={saving}
                  style={{ borderRadius: 8, height: 38, borderColor: PRIMARY, color: PRIMARY }}
                >
                  Save Configuration
                </Button>
                <Button
                  onClick={() => setEditing(false)}
                  style={{ borderRadius: 8, height: 38 }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
                style={{ borderRadius: 8, height: 38, borderColor: PRIMARY, color: PRIMARY }}
              >
                Edit Configuration
              </Button>
            )}

            {isConfigured && (
              <Button
                danger icon={<DisconnectOutlined />}
                onClick={handleDisconnect}
                loading={disconnecting}
                style={{ borderRadius: 8, height: 38 }}
              >
                Disconnect
              </Button>
            )}
          </Space>

          {config?.lastVerifiedAt && (
            <div style={{ marginTop: 20, padding: '10px 14px', background: PRIMARY_ALPHA(0.05), border: `1px solid ${PRIMARY_ALPHA(0.15)}`, borderRadius: 8 }}>
              <Text style={{ color: PRIMARY, fontSize: 13 }}>
                Last verified: {new Date(config.lastVerifiedAt).toLocaleString()}
                {config.lastSyncedAt && (
                  <>  ·  Last sync: {new Date(config.lastSyncedAt).toLocaleString()}  ·  {config.lastSyncCount || 0} template(s)</>
                )}
              </Text>
            </div>
          )}

          <div style={{ marginTop: 16, padding: '10px 14px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fafafa', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <Text style={{ color: subText, fontSize: 13 }}>All sensitive data is encrypted at rest. Disconnect removes all saved config so you can enter new credentials.</Text>
          </div>
        </>
      ),
    },

    // ── Templates Tab ──────────────────────────────────────────────────────
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
            Templates are synced from your WhatsApp backend. Click "Sync Templates" to refresh.
          </Text>

          {config?.lastSyncedAt && (
            <div style={{ marginBottom: 16, padding: '10px 14px', background: PRIMARY_ALPHA(0.06), border: `1px solid ${PRIMARY_ALPHA(0.18)}`, borderRadius: 8 }}>
              <Text style={{ color: PRIMARY, fontSize: 13 }}>
                Last synced: {new Date(config.lastSyncedAt).toLocaleString()} · {templates.length} template(s)
              </Text>
            </div>
          )}

          {templatesLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
          ) : templates.length === 0 ? (
            <Empty
              description={
                <Text style={{ color: subText }}>
                  {isConfigured
                    ? 'No templates synced yet. Click "Sync Templates" to fetch from your backend.'
                    : 'Configure your WhatsApp backend first, then sync templates.'}
                </Text>
              }
            />
          ) : (
            <Table
              columns={templateColumns}
              dataSource={templates.map((t) => ({ ...t, key: t._id }))}
              pagination={{
                defaultPageSize: 20,
                pageSizeOptions: ['10', '20', '50', '100'],
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}—${range[1]} of ${total} templates`,
              }}
              scroll={{ x: 'max-content' }}
              style={{ marginTop: 8 }}
            />
          )}
        </>,
        <Button
          type="primary"
          icon={<SyncOutlined spin={syncing} />}
          onClick={handleSync}
          loading={syncing}
          disabled={!isConfigured}
          style={{ background: PRIMARY_GRAD, border: 'none', borderRadius: 8 }}
        >
          Sync Templates
        </Button>
      ),
    },

    // ── Event Mapping Tab ──────────────────────────────────────────────────
    {
      key: 'events',
      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><LinkOutlined /> Event Mapping</span>,
      children: sectionCard(
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <LinkOutlined style={{ color: PRIMARY, fontSize: 18 }} />
            <Title level={5} style={{ color: PRIMARY, margin: 0 }}>Event → Template Mapping</Title>
          </div>
          <Text style={{ color: subText, display: 'block', marginBottom: 20 }}>
            Map CRM events to WhatsApp templates. When an event fires (e.g. order placed), the mapped template is sent automatically.
          </Text>

          {mappingsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
          ) : mappings.length === 0 ? (
            <Empty description={<Text style={{ color: subText }}>No mappings yet. Create one to start automating WhatsApp messages.</Text>} />
          ) : (
            <Table
              columns={mappingColumns}
              dataSource={mappings.map((m) => ({ ...m, key: m._id }))}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          )}
        </>,
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openMappingModal(null)}
          disabled={!isConfigured || templates.length === 0}
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

      {isConnected && (
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
            <Text style={{ color: subText, fontSize: 13 }}>
              Connected to {config?.backendUrl}. {config?.lastSyncCount || 0} templates synced.
            </Text>
          </div>
        </motion.div>
      )}

      {isConfigured && !isConnected && config?.connectionError && (
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          style={{
            margin: '16px 24px 0', padding: '14px 20px',
            background: isDark ? 'rgba(255,77,79,0.1)' : 'rgba(255,77,79,0.06)',
            border: '1px solid rgba(255,77,79,0.3)', borderRadius: 12,
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
          <div>
            <Text style={{ color: textColor, fontWeight: 600 }}>Connection error</Text>
            <br />
            <Text style={{ color: subText, fontSize: 13 }}>{config.connectionError}</Text>
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
              <Text style={{ color: subText }}>Configure WhatsApp messaging for automated notifications.</Text>
            </div>
          </div>
          <Space>
            {isConnected && (
              <Tag
                icon={<CheckCircleFilled />}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#52c41a', borderColor: 'rgba(82,196,26,0.4)', background: 'rgba(82,196,26,0.07)' }}
              >
                Connected
              </Tag>
            )}
            {isConfigured && (
              <Tag
                icon={<SettingFilled />}
                style={{ borderRadius: 20, padding: '4px 12px', fontSize: 13, color: PRIMARY, borderColor: PRIMARY_ALPHA(0.4), background: PRIMARY_ALPHA(0.07) }}
              >
                Configured
              </Tag>
            )}
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} style={{ color: textColor }} />
      </div>

      {/* ── Mapping Modal ────────────────────────────────────────────────── */}
      <Modal
        title={<Text style={{ color: textColor, fontWeight: 600 }}>{editMapping ? 'Edit Event Mapping' : 'Create Event Mapping'}</Text>}
        open={mappingModalOpen}
        onOk={saveMappingModal}
        onCancel={() => setMappingModalOpen(false)}
        confirmLoading={savingMap}
        okText="Save Mapping"
        okButtonProps={{ style: { background: PRIMARY_GRAD, border: 'none' } }}
        width={600}
        style={{ top: '10%' }}
      >
        <Form form={mappingForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="eventId" label="CRM Event" rules={[{ required: true, message: 'Select an event' }]}>
            <Select
              placeholder="Select the CRM event that triggers this message"
              onChange={() => {
                setVariableRows([]);
                mappingForm.setFieldsValue({ templateId: undefined });
              }}
            >
              {events.map((e) => <Option key={e._id} value={e._id}>{e.label}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item name="templateId" label="WhatsApp Template" rules={[{ required: true, message: 'Select a template' }]}>
            <Select
              placeholder="Select template to send"
              onChange={handleTemplateSelect}
              showSearch
              optionFilterProp="children"
            >
              {templatesForEvent.map((t) => (
                <Option key={t._id} value={t._id}>
                  {t.name} <Tag style={{ marginLeft: 6 }} color={t.status === 'APPROVED' ? 'success' : 'warning'}>{t.status}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isEnabled" label="Status" initialValue={true}>
            <Select>
              <Option value={true}>Active</Option>
              <Option value={false}>Inactive</Option>
            </Select>
          </Form.Item>

          {isDateDrivenEvent && !isEscalationEvent && (
            <Form.Item
              label={
                <Space size={4}>
                  <Text style={{ color: textColor, fontWeight: 500 }}>Daily Send Time</Text>
                  <Text style={{ color: subText, fontSize: 12 }}>(checked every day against the lead's date for this event)</Text>
                </Space>
              }
            >
              <TimePicker
                use12Hours
                format="hh:mm A"
                value={sendTime}
                onChange={(val) => setSendTime(val)}
                minuteStep={1}
                style={{ width: '100%', borderColor, borderRadius: 8, height: 40 }}
                allowClear={false}
              />
            </Form.Item>
          )}

          {(isEscalationEvent || isRecipientOnlyEvent) && (() => {
            const recipientPool = isEscalationEvent ? financeUsers : adminUsers;
            const deptLabel = isEscalationEvent ? 'Finance' : 'Admin / Management / Super Admin';
            return (
              <Form.Item
                label={<Text style={{ color: textColor, fontWeight: 500 }}>Recipients</Text>}
                required={isEscalationEvent}
                tooltip={isRecipientOnlyEvent ? "Optional — if none are selected, every Super Admin/Admin is notified instead" : undefined}
              >
                <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, padding: 10, maxHeight: 220, overflowY: 'auto' }}>
                  <Checkbox.Group
                    style={{ width: '100%' }}
                    value={escRecipients}
                    onChange={(vals) => setEscRecipients(vals)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {recipientPool.map((u) => (
                        <div
                          key={u._id}
                          style={{
                            padding: '8px 10px', borderRadius: 8,
                            background: escRecipients.includes(u._id) ? PRIMARY_ALPHA(0.08) : 'transparent',
                            border: `1px solid ${escRecipients.includes(u._id) ? PRIMARY_ALPHA(0.3) : borderColor}`,
                          }}
                        >
                          <Checkbox value={u._id}>
                            <Text style={{ color: textColor, fontWeight: 600 }}>{u.fullName}</Text>
                            <Text style={{ color: subText }}> — {u.role || deptLabel}</Text>
                            <br />
                            <Text style={{ color: subText, fontSize: 12 }}>{u.email}{u.mobile ? ` — ${u.mobile}` : ''}</Text>
                          </Checkbox>
                        </div>
                      ))}
                    </Space>
                  </Checkbox.Group>
                  {recipientPool.length === 0 && (
                    <Text style={{ color: subText, fontSize: 12 }}>No active {deptLabel} users found. Add one in Settings → Staff Management first.</Text>
                  )}
                </div>
                <Text style={{ color: subText, fontSize: 12, display: 'block', marginTop: 6 }}>
                  Multiple selection enabled. Showing active `{deptLabel}` users from the Users collection.
                </Text>
              </Form.Item>
            );
          })()}

          {isEscalationEvent && (
            <>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item label={<Text style={{ color: textColor, fontWeight: 500 }}>Start Time</Text>}>
                    <TimePicker
                      format="HH:mm" minuteStep={5} allowClear={false}
                      value={escStartTime} onChange={(val) => setEscStartTime(val)}
                      style={{ width: '100%', borderRadius: 8, height: 40 }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label={<Text style={{ color: textColor, fontWeight: 500 }}>End Time</Text>}>
                    <TimePicker
                      format="HH:mm" minuteStep={5} allowClear={false}
                      value={escEndTime} onChange={(val) => setEscEndTime(val)}
                      style={{ width: '100%', borderRadius: 8, height: 40 }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label={<Text style={{ color: textColor, fontWeight: 500 }}>Delay Minutes</Text>} tooltip="Repeat the reminder this often, between Start Time and End Time, until it's paid">
                <InputNumber
                  min={5} max={720} value={escDelayMinutes}
                  onChange={(val) => setEscDelayMinutes(val)}
                  style={{ width: '100%', borderRadius: 8 }}
                />
              </Form.Item>

              <Form.Item label={<Text style={{ color: textColor, fontWeight: 500 }}>Days</Text>}>
                <Space wrap style={{ marginBottom: 8 }}>
                  <Button size="small" onClick={() => setEscDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])} style={{ borderRadius: 6 }}>Mon–Sat</Button>
                  <Button size="small" onClick={() => setEscDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])} style={{ borderRadius: 6 }}>Mon–Fri</Button>
                </Space>
                <div>
                  <Text style={{ color: subText, fontSize: 12 }}>Selected: {escDays.length ? escDays.join(', ') : 'None'}</Text>
                </div>
                <Space wrap style={{ marginTop: 8 }}>
                  {ALL_DAYS.map((d) => {
                    const active = escDays.includes(d);
                    return (
                      <Tag
                        key={d}
                        onClick={() => setEscDays((prev) => active ? prev.filter((x) => x !== d) : [...prev, d])}
                        style={{
                          cursor: 'pointer', borderRadius: 14, padding: '3px 12px', fontWeight: 600,
                          color: active ? '#fff' : textColor,
                          background: active ? PRIMARY : 'transparent',
                          borderColor: active ? PRIMARY : borderColor,
                        }}
                      >
                        {d}
                      </Tag>
                    );
                  })}
                </Space>
              </Form.Item>
            </>
          )}

          {variableRows.length > 0 && (
            <Form.Item label="Variable Mapping">
              <Text style={{ color: subText, fontSize: 12, display: 'block', marginBottom: 10 }}>
                Map each template variable to a CRM event field.
              </Text>
              {variableRows.map((row, idx) => (
                <Row key={idx} gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Input
                      value={row.templateVariable}
                      readOnly
                      style={{ background: inputBg, border: `1px solid ${borderColor}`, color: textColor, borderRadius: 6 }}
                      prefix={<Text style={{ color: subText, fontSize: 11 }}>TPL</Text>}
                    />
                  </Col>
                  <Col span={1} style={{ textAlign: 'center', paddingTop: 6 }}>→</Col>
                  <Col span={13}>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="Select event field"
                      value={row.eventField || undefined}
                      onChange={(val) => setVariableRows((prev) => prev.map((r, i) => i === idx ? { ...r, eventField: val } : r))}
                    >
                      {(selectedEvent?.availableFields || []).map((f) => (
                        <Option key={f} value={f}>{f}</Option>
                      ))}
                    </Select>
                  </Col>
                </Row>
              ))}
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
