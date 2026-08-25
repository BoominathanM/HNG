import { useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Row, Col, Card, Typography, Space, Tag, Button, Checkbox, TimePicker,
  InputNumber, Select, Upload, Switch, Divider, Spin, Empty,
} from 'antd';
import { UploadOutlined, SoundOutlined, SaveOutlined } from '@ant-design/icons';
import { enqueueSnackbar } from 'notistack';
import {
  useGetAlertConfigsQuery,
  useSaveAlertConfigMutation,
  useUploadAlertAudioMutation,
  useGetUsersQuery,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;

const PRIMARY = '#B11E6A';
const PRIMARY_ALPHA = (a) => `rgba(177,30,106,${a})`;
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DESIGN_ROLES = [
  { role: 'Sticker', label: 'Sticker' },
  { role: 'Box', label: 'Box' },
  { role: 'Ziplock', label: 'Frosted Ziplock' },
  { role: 'Butter Paper', label: 'Butter Paper' },
  { role: 'Wooden Brush', label: 'Wooden Brush' },
  { role: 'Other', label: 'Other' },
];

function AlertConfigCard({ title, description, group, role, config, recipientPool, deptLabel, dynamicRecipient, dynamicNote, recipientsOptional, graceLabel }) {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [saveAlertConfig, { isLoading: saving }] = useSaveAlertConfigMutation();
  const [uploadAudio, { isLoading: uploading }] = useUploadAlertAudioMutation();

  // The parent gates rendering on the configs query having already loaded (see
  // `configsLoading` in AlertConfigurationTab below), and remounts this card via
  // `key={config?._id}` whenever the identity of the underlying doc changes — so
  // lazy initial state from `config` is enough; no effect/resync needed.
  const [recipients, setRecipients] = useState(() => (config?.recipientUserIds || []).map((u) => u?._id || u));
  const [startTime, setStartTime] = useState(() => (config?.startTime ? dayjs(config.startTime, 'HH:mm') : dayjs('09:00', 'HH:mm')));
  const [endTime, setEndTime] = useState(() => (config?.endTime ? dayjs(config.endTime, 'HH:mm') : dayjs('18:00', 'HH:mm')));
  const [durationMinutes, setDurationMinutes] = useState(() => config?.durationMinutes || 30);
  const [graceValue, setGraceValue] = useState(() => config?.graceValue || 3);
  const [graceUnit, setGraceUnit] = useState(() => config?.graceUnit || 'days');
  const [days, setDays] = useState(() => (config?.days?.length ? config.days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']));
  const [isEnabled, setIsEnabled] = useState(() => !!config?.isEnabled);
  const [audioFile, setAudioFile] = useState(() => (config?.audioUrl ? { url: config.audioUrl, public_id: config.audioPublicId, name: config.audioName } : null)); // { url, public_id, name }

  const handleAudioUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('audio', file);
    try {
      const res = await uploadAudio(formData).unwrap();
      setAudioFile({ url: res.url, public_id: res.public_id, name: res.name || file.name });
      onSuccess(res, file);
      enqueueSnackbar('Alert audio uploaded', { variant: 'success' });
    } catch (err) {
      onError(err);
      enqueueSnackbar(err?.data || 'Audio upload failed', { variant: 'error' });
    }
  };

  const handleSave = async () => {
    if (isEnabled && !dynamicRecipient && !recipientsOptional && !recipients.length) {
      enqueueSnackbar('Select at least one recipient before enabling this alert', { variant: 'warning' });
      return;
    }
    if (isEnabled && !audioFile?.url) {
      enqueueSnackbar('Upload an alert audio file before enabling this alert', { variant: 'warning' });
      return;
    }
    if (isEnabled && graceLabel && (!graceValue || graceValue <= 0)) {
      enqueueSnackbar(`Set how long to wait before the first alert (${graceLabel.toLowerCase()})`, { variant: 'warning' });
      return;
    }
    try {
      await saveAlertConfig({
        group,
        role,
        recipientUserIds: recipients,
        startTime: startTime?.format('HH:mm') || '09:00',
        endTime: endTime?.format('HH:mm') || '18:00',
        durationMinutes: durationMinutes || 30,
        days,
        ...(graceLabel ? { graceValue, graceUnit } : {}),
        audioUrl: audioFile?.url,
        audioPublicId: audioFile?.public_id,
        audioName: audioFile?.name,
        isEnabled,
      }).unwrap();
      enqueueSnackbar(`${title} alert saved`, { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err?.data || 'Failed to save alert config', { variant: 'error' });
    }
  };

  return (
    <Card
      style={{ borderRadius: 14, border: `1px solid ${borderColor}`, background: cardBg, height: '100%' }}
      bodyStyle={{ padding: 18 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <Text strong style={{ color: textColor, fontSize: 15 }}>{title}</Text>
          <div><Text style={{ color: subText, fontSize: 12 }}>{description}</Text></div>
        </div>
        <Switch checked={isEnabled} onChange={setIsEnabled} checkedChildren="On" unCheckedChildren="Off" />
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {dynamicNote && (
        <div style={{ marginBottom: 12, padding: '6px 10px', borderRadius: 8, background: PRIMARY_ALPHA(0.08) }}>
          <Text style={{ color: subText, fontSize: 12 }}>{dynamicNote}</Text>
        </div>
      )}

      {!dynamicRecipient && (
        <>
          <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>Recipients ({deptLabel}){recipientsOptional ? ' — optional' : ''}</Text>
          <div style={{ border: `1px solid ${borderColor}`, borderRadius: 8, padding: 8, maxHeight: 160, overflowY: 'auto', marginTop: 6, marginBottom: 12 }}>
            {recipientPool.length === 0 ? (
              <Text style={{ color: subText, fontSize: 12 }}>No active {deptLabel} users found. Add one in the Users tab first.</Text>
            ) : (
              <Checkbox.Group style={{ width: '100%' }} value={recipients} onChange={setRecipients}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {recipientPool.map((u) => (
                    <div
                      key={u._id}
                      style={{
                        padding: '6px 8px', borderRadius: 6,
                        background: recipients.includes(u._id) ? PRIMARY_ALPHA(0.08) : 'transparent',
                      }}
                    >
                      <Checkbox value={u._id}>
                        <Text style={{ color: textColor, fontSize: 13 }}>{u.fullName}</Text>
                        <Text style={{ color: subText, fontSize: 12 }}> — {u.role}</Text>
                      </Checkbox>
                    </div>
                  ))}
                </Space>
              </Checkbox.Group>
            )}
          </div>
        </>
      )}

      <Row gutter={12}>
        <Col span={12}>
          <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>Start Time</Text>
          <TimePicker
            format="HH:mm" minuteStep={5} allowClear={false}
            value={startTime} onChange={setStartTime}
            style={{ width: '100%', marginTop: 6, borderRadius: 8 }}
          />
        </Col>
        <Col span={12}>
          <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>End Time</Text>
          <TimePicker
            format="HH:mm" minuteStep={5} allowClear={false}
            value={endTime} onChange={setEndTime}
            style={{ width: '100%', marginTop: 6, borderRadius: 8 }}
          />
        </Col>
      </Row>

      {graceLabel && (
        <div style={{ marginTop: 12 }}>
          <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>{graceLabel}</Text>
          <Space.Compact style={{ width: '100%', marginTop: 6 }}>
            <InputNumber min={1} max={graceUnit === 'hours' ? 720 : 90} value={graceValue} onChange={setGraceValue} style={{ width: '60%', borderRadius: 8 }} />
            <Select
              value={graceUnit} onChange={setGraceUnit} style={{ width: '40%' }}
              options={[{ value: 'days', label: 'Days' }, { value: 'hours', label: 'Hours' }]}
            />
          </Space.Compact>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>Repeat Every (minutes)</Text>
        <InputNumber
          min={5} max={720} value={durationMinutes} onChange={setDurationMinutes}
          style={{ width: '100%', marginTop: 6, borderRadius: 8 }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>Working Days</Text>
        <div style={{ marginTop: 6 }}>
          <Space wrap style={{ marginBottom: 6 }}>
            <Button size="small" onClick={() => setDays(ALL_DAYS)} style={{ borderRadius: 6 }}>Sun–Sat (All Days)</Button>
            <Button size="small" onClick={() => setDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])} style={{ borderRadius: 6 }}>Mon–Sat</Button>
            <Button size="small" onClick={() => setDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])} style={{ borderRadius: 6 }}>Mon–Fri</Button>
          </Space>
          <div>
            {ALL_DAYS.map((d) => {
              const active = days.includes(d);
              return (
                <Tag
                  key={d}
                  onClick={() => setDays((prev) => (active ? prev.filter((x) => x !== d) : [...prev, d]))}
                  style={{
                    cursor: 'pointer', borderRadius: 14, padding: '2px 10px', fontWeight: 600, marginBottom: 6,
                    color: active ? '#fff' : textColor,
                    background: active ? PRIMARY : 'transparent',
                    borderColor: active ? PRIMARY : borderColor,
                  }}
                >
                  {d}
                </Tag>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text style={{ color: textColor, fontWeight: 500, fontSize: 13 }}>Alert Audio</Text>
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Upload accept="audio/*" showUploadList={false} customRequest={handleAudioUpload}>
            <Button icon={<UploadOutlined />} loading={uploading} size="small" style={{ borderRadius: 6 }}>
              {audioFile?.url ? 'Replace Audio' : 'Upload Audio'}
            </Button>
          </Upload>
          {audioFile?.url && (
            <Space size={6}>
              <SoundOutlined style={{ color: PRIMARY }} />
              <Text style={{ color: subText, fontSize: 12 }}>{audioFile.name || 'audio file'}</Text>
              <audio controls src={audioFile.url} style={{ height: 30, maxWidth: 200 }} />
            </Space>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}
          style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8 }}>
          Save
        </Button>
      </div>
    </Card>
  );
}

export default function AlertConfigurationTab() {
  const isDark = useSelector((s) => s.theme.isDark);
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subText = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const { data: configsData, isLoading: configsLoading } = useGetAlertConfigsQuery();
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({ limit: 1000 });

  const configs = configsData?.data || [];
  const users = usersData?.data || [];

  const findConfig = (group, role) =>
    configs.find((c) => c.group === group && (role ? c.role === role : !c.role));

  const vendorUsersFor = (role) =>
    users.filter((u) => u.department === 'Vendors' && u.role === role && u.status === 'Active');
  const salesUsers = users.filter((u) => u.department === 'Sales' && u.status === 'Active');
  const opsUsers = users.filter((u) => u.department === 'Operations' && u.status === 'Active');
  const financeUsers = users.filter((u) => u.department === 'Financial' && u.status === 'Active');
  const purchaseUsers = users.filter((u) => u.department === 'Purchase' && u.status === 'Active');
  const shortReceivedUsers = users.filter((u) => ['Dispatch', 'Financial', 'Purchase'].includes(u.department) && u.status === 'Active');

  if (configsLoading || usersLoading) {
    return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Design Alerts</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          One config per vendor role. Rings for every new order arriving into that queue, repeating on the schedule below, until the item is dispatched.
        </Text>
      </div>
      {DESIGN_ROLES.every((r) => vendorUsersFor(r.role).length === 0) && (
        <Empty
          style={{ margin: '12px 0' }}
          description="No active Vendors users found for Sticker/Box/Ziplock/Butter Paper/Wooden Brush/Other roles yet — add them in the Users tab to enable these alerts."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
      <Row gutter={[16, 16]}>
        {DESIGN_ROLES.map((r) => (
          <Col xs={24} md={12} key={r.role}>
            <AlertConfigCard
              key={findConfig('design', r.role)?._id || r.role}
              title={`${r.label} Alert`}
              description={`Notifies selected Vendors → ${r.label} users on every new arrival until dispatch.`}
              group="design"
              role={r.role}
              config={findConfig('design', r.role)}
              recipientPool={vendorUsersFor(r.role)}
              deptLabel={`Vendors — ${r.label}`}
            />
          </Col>
        ))}
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Sales Approval Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings while a design-queue item or emergency dispatch is waiting on Sales approval, until it's approved.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('sales_approval', null)?._id || 'sales_approval'}
            title="Sales Approval Alert"
            description="Notifies selected Sales users about pending approvals."
            group="sales_approval"
            role={null}
            config={findConfig('sales_approval', null)}
            recipientPool={salesUsers}
            deptLabel="Sales"
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Operations Approval Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings while a design-queue item or emergency dispatch is waiting on Operations approval, until it's approved.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('operations_approval', null)?._id || 'operations_approval'}
            title="Operations Approval Alert"
            description="Notifies selected Operations users about pending approvals."
            group="operations_approval"
            role={null}
            config={findConfig('operations_approval', null)}
            recipientPool={opsUsers}
            deptLabel="Operations"
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Task Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings the assigned staff member's browser from the moment a task is assigned, repeating on the schedule below, until it's marked Done.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('task', null)?._id || 'task'}
            title="Task Alert"
            description="Notifies whichever staff member a task is assigned to, until it's marked Done."
            group="task"
            role={null}
            config={findConfig('task', null)}
            dynamicRecipient
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Dispatch Reason Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings the order's own assigned sales person when Dispatch reports an invoice/lorry receipt mismatch reason, until it's approved or rejected.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('dispatch_reason', null)?._id || 'dispatch_reason'}
            title="Dispatch Reason Alert"
            description="Notifies the order's assigned sales person about a pending invoice mismatch reason."
            group="dispatch_reason"
            role={null}
            config={findConfig('dispatch_reason', null)}
            dynamicRecipient
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Dispatch Status Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings when an order goes to Partial Dispatch, and again once its dispatch process is completed — always notifies the order's own assigned sales person, plus any Finance users selected below.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('dispatch_status', null)?._id || 'dispatch_status'}
            title="Dispatch Status Alert"
            description="Notifies the order's assigned sales person and selected Finance users about partial/completed dispatches."
            group="dispatch_status"
            role={null}
            config={findConfig('dispatch_status', null)}
            recipientPool={financeUsers}
            deptLabel="Financial"
            recipientsOptional
            dynamicNote="Always notifies the order's own assigned sales person automatically — the Financial recipients below are notified in addition."
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>LR Payment Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings the selected Finance users once a vendor LR's expected delivery date arrives while it's still marked "Not Paid", repeating on the schedule below, until Finance settles it.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('lr_payment', null)?._id || 'lr_payment'}
            title="LR Payment Alert"
            description="Notifies selected Finance users about vendor LRs due for payment."
            group="lr_payment"
            role={null}
            config={findConfig('lr_payment', null)}
            recipientPool={financeUsers}
            deptLabel="Financial"
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Short-Received Purchase Orders Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Rings the selected Dispatch / Financial / Purchase users while a purchase order is partially received (missed by the lorry/vendor), repeating on the schedule below, until Purchase marks it "Completely Received" in the Missing/Short-Received Orders table's Action Taken dropdown.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('short_received', null)?._id || 'short_received'}
            title="Short-Received Purchase Orders"
            description="Notifies selected Dispatch, Financial and Purchase users about partially received purchase orders still pending the missing quantity."
            group="short_received"
            role={null}
            config={findConfig('short_received', null)}
            recipientPool={shortReceivedUsers}
            deptLabel="Dispatch / Financial / Purchase"
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Low Stock Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Once a product drops below its Min Stock, waits the grace period below, then rings selected Purchase users — repeating on the schedule below, checked separately per product by name — until it's restocked to/above Min Stock.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('low_stock', null)?._id || 'low_stock'}
            title="Low Stock Alert"
            description="Notifies selected Purchase users about products still short of stock past the grace period."
            group="low_stock"
            role={null}
            config={findConfig('low_stock', null)}
            recipientPool={purchaseUsers}
            deptLabel="Purchase"
            graceLabel="Alert After (if not purchased)"
          />
        </Col>
      </Row>

      <Divider />

      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ color: textColor, margin: 0 }}>Quotation Request Alert</Title>
        <Text style={{ color: subText, fontSize: 13 }}>
          Once a vendor quotation is Asked (or Re-Asked), waits the grace period below, then rings selected Purchase users — repeating on the schedule below — until the request is actually Raised.
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AlertConfigCard
            key={findConfig('quotation_request', null)?._id || 'quotation_request'}
            title="Quotation Request Alert"
            description="Notifies selected Purchase users about quotations asked (or re-asked) but not yet raised."
            group="quotation_request"
            role={null}
            config={findConfig('quotation_request', null)}
            recipientPool={purchaseUsers}
            deptLabel="Purchase"
            graceLabel="Alert After (if not raised)"
          />
        </Col>
      </Row>
    </div>
  );
}
