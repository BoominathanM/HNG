import React, { useState, useMemo } from 'react';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Button, Form, Input, Upload, Typography, Space,
  Steps, Descriptions, Alert, Tag, DatePicker, Checkbox,
  Select, Table, Divider,
} from 'antd';
import { enqueueSnackbar } from 'notistack';
import {
  CameraOutlined, UploadOutlined, EnvironmentOutlined,
  ArrowLeftOutlined, PrinterOutlined, SaveOutlined, ThunderboltOutlined,
  InboxOutlined, CheckCircleOutlined, FileDoneOutlined, CheckSquareOutlined,
  LinkOutlined, BellOutlined, CarOutlined, WhatsAppOutlined, EditOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import {
  useGetDispatchQuery,
  useConfirmDispatchMutation,
  useUploadDispatchLRMutation,
  useVerifyItemMutation,
  useSaveAsDraftMutation,
  useUploadBoxPhotosMutation,
  useVerifyInvoiceMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const statusColor = {
  'Ready to Dispatch': '#C94F8A',
  'Payment Pending': '#D85C9E',
  'Dispatched': '#6b1240',
  'Packing': '#B11E6A',
};

const stepIndex = (status) => {
  if (status === 'Dispatched') return 3;
  if (status === 'Ready to Dispatch') return 2;
  if (status === 'Payment Pending') return 1;
  return 0;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DispatchDetail() {
  const makeUpload = useCloudinaryUpload();
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useSelector((s) => s.theme.isDark);

  const { data: dispatchData } = useGetDispatchQuery(id, { skip: !id });
  const [confirmDispatch] = useConfirmDispatchMutation();
  const [uploadLR] = useUploadDispatchLRMutation();
  const [verifyItem] = useVerifyItemMutation();
  const [saveAsDraft] = useSaveAsDraftMutation();
  const [uploadBoxPhotos] = useUploadBoxPhotosMutation();
  const [verifyInvoice] = useVerifyInvoiceMutation();
  const [invoiceVerdict, setInvoiceVerdict] = useState(null);

  const handleBoxPhotoUpload = async (type, file) => {
    try {
      const fd = new FormData();
      fd.append('photos', file);
      fd.append('type', type);
      await uploadBoxPhotos({ id, formData: fd }).unwrap();
      enqueueSnackbar(`${type === 'close' ? 'Closed' : 'Open'} box photo uploaded`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Box photo upload failed', { variant: 'error' });
    }
    return false; // prevent antd auto-upload
  };

  const handleVerifyInvoice = async () => {
    try {
      const vals = form.getFieldsValue();
      const res = await verifyInvoice({ id, invoiceNumber: vals.invoiceNumber, invoiceTotal: order?.total }).unwrap();
      setInvoiceVerdict(res.data);
      enqueueSnackbar(`Invoice ${res.data.verdict} (${res.data.score})`, { variant: res.data.verdict === 'verified' ? 'success' : res.data.verdict === 'failed' ? 'error' : 'warning' });
    } catch {
      enqueueSnackbar('Invoice verification failed', { variant: 'error' });
    }
  };

  const order = useMemo(() => {
    const d = dispatchData?.data;
    if (!d) return null;
    // getDispatch populates `orderId` as a nested object — read order context from there,
    // falling back to any denormalized fields on the dispatch root.
    const o = (d.orderId && typeof d.orderId === 'object') ? d.orderId : {};
    // Payment is "Confirmed" for dispatch purposes once the order balance is cleared.
    const paymentConfirmed = (o.balance != null && o.balance <= 0) || o.status === 'Completed' || d.paymentStatus === 'Paid';
    return {
      key: d._id, id: o.orderCode || d.orderCode || d._id,
      orderObjectId: o._id || d.orderId,
      client: o.clientName || d.clientName || '—', contactPerson: o.contactPerson || d.contactPerson || '—',
      phone: o.clientPhone || d.clientPhone || '', email: o.clientEmail || d.clientEmail || '',
      product: o.product || d.product || '', qty: o.qty || d.qty || 0,
      boxes: d.boxes || 0, weight: d.weight || '',
      payment: paymentConfirmed ? 'Confirmed' : 'Pending',
      address: o.address || d.address || '', destination: o.destination || d.destination || '',
      detailedAddress: d.detailedAddress || '',
      city: d.city || '', state: d.state || '', pincode: d.pincode || '',
      transport: d.transportName || '', status: d.status || '',
      salesPerson: o.assignedTo?.fullName || d.salesPerson || '',
      // dispatch line items (these carry _id for per-product verification)
      items: (d.items && d.items.length ? d.items : (o.items || [])),
      lrData: d.lrData || null,
    };
  }, [dispatchData]);

  const [form] = Form.useForm();
  const [lrForm] = Form.useForm();
  const [trackingForm] = Form.useForm();

  // Dispatch verification state
  const [dispatchType, setDispatchType] = useState(null);
  const [verifiedProducts, setVerifiedProducts] = useState(new Set());
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyAuto, setNotifyAuto] = useState(true);
  const [dispatched, setDispatched] = useState(false);

  // Post-dispatch state (lorry receipt section)
  const [lrFileList, setLrFileList] = useState([]);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(null);
  const [lrEditMode, setLrEditMode] = useState(false);
  const [finishedDispatch, setFinishedDispatch] = useState(false);

  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';
  const sectionBg = isDark ? '#161622' : '#fafbff';

  const toggleVerify = async (productKey, itemId) => {
    const willVerify = !verifiedProducts.has(productKey);
    setVerifiedProducts(prev => {
      const next = new Set(prev);
      next.has(productKey) ? next.delete(productKey) : next.add(productKey);
      return next;
    });
    // Persist verification to the backend (only when marking verified and we have a real item id)
    if (willVerify && itemId) {
      try {
        await verifyItem({ id, itemId }).unwrap();
      } catch {
        enqueueSnackbar('Failed to persist verification', { variant: 'error' });
      }
    }
  };

  const handlePrintDispatchDetails = () => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=600,height=800');
    win.document.write(`<!DOCTYPE html><html><head><title>Dispatch Details — ${order.id}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 32px; font-size: 13px; color: #111; }
  h2 { color: #B11E6A; margin-bottom: 4px; }
  .badge { background: #B11E6A; color: #fff; display: inline-block; padding: 2px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
</style></head><body>
<div class="badge">HEAL N GLOW — DISPATCH DETAILS</div>
<h2>${order.id} — ${order.client}</h2>
<table>
  <tr><th>Client</th><td>${order.client}</td><th>Contact</th><td>${order.contactPerson}</td></tr>
  <tr><th>Phone</th><td>${order.phone}</td><th>Email</th><td>${order.email}</td></tr>
  <tr><th>Destination</th><td>${order.destination || '—'}</td><th>Address</th><td>${order.detailedAddress}, ${order.city}, ${order.state} — ${order.pincode}</td></tr>
  <tr><th>Product</th><td>${order.product}</td><th>Quantity</th><td>${order.qty.toLocaleString()} units</td></tr>
  <tr><th>Boxes</th><td>${order.boxes}</td><th>Weight</th><td>${order.weight}</td></tr>
  <tr><th>Transport</th><td>${order.transport || '—'}</td><th>Sales Person</th><td>${order.salesPerson}</td></tr>
  <tr><th>Payment</th><td>${order.payment}</td><th>Status</th><td>${order.status}</td></tr>
</table>
</body></html>`);
    win.document.close();
    win.print();
  };

  const handleConfirmDispatch = async () => {
    enqueueSnackbar('Confirming dispatch...', { variant: 'info' });
    try {
      const formData = new FormData();
      const vals = form.getFieldsValue();
      formData.append('transport', vals.transport || order.transport || '');
      formData.append('boxes', vals.boxes ?? order.boxes ?? 0);
      formData.append('weight', vals.weight ?? order.weight ?? '');
      formData.append('dispatchType', vals.dispatchType || dispatchType || 'Full Dispatch');
      formData.append('invoiceNumber', vals.invoiceNumber || '');
      if (vals.invoiceDate) formData.append('invoiceDate', vals.invoiceDate.format ? vals.invoiceDate.format('YYYY-MM-DD') : vals.invoiceDate);
      // Backend reads autoNotify / sendWhatsapp (FormData sends them as strings).
      formData.append('autoNotify', notifyAuto);
      formData.append('sendWhatsapp', notifyWhatsApp);
      // Attach the invoice file if one was selected (confirm route accepts upload.single('invoice')).
      const invoiceFile = vals.invoiceFile?.[0]?.originFileObj || vals.invoiceFile?.file?.originFileObj;
      if (invoiceFile) formData.append('invoice', invoiceFile);
      await confirmDispatch({ id, formData }).unwrap();
      setDispatched(true);
      const notifyParts = [notifyAuto && 'Sales & Customer', notifyWhatsApp && 'WhatsApp'].filter(Boolean).join(', ');
      enqueueSnackbar(`Dispatch confirmed! Notifications sent via: ${notifyParts || 'none'}.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to confirm dispatch.', { variant: 'error' });
    }
  };

  const handleSaveDraft = async () => {
    try {
      const vals = form.getFieldsValue();
      await saveAsDraft({
        id,
        dispatchType: vals.dispatchType || dispatchType || undefined,
        invoiceNumber: vals.invoiceNumber || undefined,
        invoiceDate: vals.invoiceDate?.format ? vals.invoiceDate.format('YYYY-MM-DD') : vals.invoiceDate,
        autoNotify: notifyAuto,
        sendWhatsapp: notifyWhatsApp,
      }).unwrap();
      enqueueSnackbar('Saved as draft', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save draft', { variant: 'error' });
    }
  };

  const handleAIParse = () => {
    setAiParsing(true);
    setTimeout(() => {
      const parsed = { lrNumber: '', lrDate: '', transportName: '', fromCity: 'Coimbatore', toCity: '', weight: '', freight: '', packages: '', estimatedDelivery: '' };
      setAiParsed(parsed);
      lrForm.setFieldsValue(parsed);
      setAiParsing(false);
      setLrEditMode(true);
      enqueueSnackbar('AI extracted lorry receipt details. Review and confirm below.', { variant: 'success' });
    }, 1800);
  };

  const handleFinishedDispatch = async () => {
    enqueueSnackbar('Sending notifications...', { variant: 'info' });
    try {
      const lrVals = lrForm.getFieldsValue();
      const trackVals = trackingForm.getFieldsValue();
      const lrFile = lrFileList?.[0]?.originFileObj;
      let payload;
      if (lrFile) {
        // Send multipart so the LR receipt file is actually uploaded (route uses upload.single('lr')).
        const fd = new FormData();
        fd.append('lr', lrFile);
        Object.entries({
          lrNumber: lrVals.lrNumber || trackVals.trackingLR || '',
          trackingUrl: trackVals.trackingUrl || '',
          lrDate: lrVals.lrDate || '', transportName: lrVals.transportName || '',
          packages: lrVals.packages || '', fromCity: lrVals.fromCity || '',
          toCity: lrVals.toCity || '', weight: lrVals.weight || '',
          freight: lrVals.freight || '', estimatedDelivery: lrVals.estimatedDelivery || '',
        }).forEach(([k, v]) => fd.append(k, v));
        payload = { id, formData: fd };
      } else {
        payload = {
          id,
          lrNumber: lrVals.lrNumber || trackVals.trackingLR || '',
          trackingUrl: trackVals.trackingUrl || '',
          lrDate: lrVals.lrDate || '',
          transportName: lrVals.transportName || '',
          packages: lrVals.packages || '',
          fromCity: lrVals.fromCity || '',
          toCity: lrVals.toCity || '',
          weight: lrVals.weight || '',
          freight: lrVals.freight || '',
          estimatedDelivery: lrVals.estimatedDelivery || '',
        };
      }
      await uploadLR(payload).unwrap();
      setFinishedDispatch(true);
      enqueueSnackbar(`Dispatch Finished! Notifications sent to Sales (${order.salesPerson}) and Customer (${order.client}) via WhatsApp.`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to finish dispatch.', { variant: 'error' });
    }
  };

  if (!order) {
    return (
      <div className="page-container">
        <Alert type="error" message={`Order "${id}" not found.`} showIcon style={{ borderRadius: 8 }} />
        <Button style={{ marginTop: 12 }} icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')}>Back to Dispatch</Button>
      </div>
    );
  }

  const products = (order?.items || []).map((item, i) => ({ key: i + 1, itemId: item._id, name: item.product || item.name || item.itemName, qty: item.qty || item.qtyOrdered || 0, rate: item.rate || item.price || 0, boxes: item.boxes || 0, verified: item.verified }));
  // Doc: every product must be verified before dispatch can be confirmed.
  const allProductsVerified = products.length > 0 && products.every((p) => verifiedProducts.has(p.key) || p.verified);
  const lrUploaded = lrFileList.length > 0;

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dispatch')} style={{ flexShrink: 0 }}>Back</Button>
        <PageBreadcrumb
          title={`Dispatch: ${order.id}`}
          items={[{ label: 'Dispatch', link: '/dispatch' }, { label: order.id }]}
        />
        {dispatched && (
          <Tag color="success" style={{ borderRadius: 20, fontSize: 12, padding: '2px 12px' }}>
            <CheckCircleOutlined /> Dispatched
          </Tag>
        )}
      </div>

      {order.payment !== 'Confirmed' && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert type="error" showIcon
            message="Dispatch Blocked — Payment Not Confirmed"
            description="This order cannot be dispatched until full payment is received."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        </motion.div>
      )}

      <Row gutter={[16, 16]}>
        {/* ── Left: Order Details ─────────────────────────────────────────── */}
        <Col xs={24} lg={10}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Order Details</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Descriptions bordered size="small" column={1} labelStyle={{ width: 130 }}>
                <Descriptions.Item label="Order ID">
                  <Text strong style={{ color: '#B11E6A' }}>{order.id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Client"><Text strong>{order.client}</Text></Descriptions.Item>
                <Descriptions.Item label="Contact Person">{order.contactPerson}</Descriptions.Item>
                <Descriptions.Item label="Phone">
                  <a href={`tel:${order.phone}`} style={{ color: '#B11E6A' }}>{order.phone}</a>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{order.email}</Descriptions.Item>
                <Descriptions.Item label="Destination">
                  <Space size={4}><EnvironmentOutlined style={{ color: '#B11E6A' }} /><Text strong>{order.destination || '—'}</Text></Space>
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  <Space align="start">
                    <EnvironmentOutlined style={{ color: '#B11E6A', marginTop: 2 }} />
                    <span>{order.detailedAddress},<br />{order.city}, {order.state} — {order.pincode}</span>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Product">{order.product}</Descriptions.Item>
                <Descriptions.Item label="Quantity">{order.qty.toLocaleString()} units</Descriptions.Item>
                <Descriptions.Item label="Boxes">
                  <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text strong>{order.boxes}</Text></Space>
                </Descriptions.Item>
                <Descriptions.Item label="Weight">{order.weight}</Descriptions.Item>
                <Descriptions.Item label="Transport">{order.transport || '—'}</Descriptions.Item>
                <Descriptions.Item label="Sales Person">{order.salesPerson}</Descriptions.Item>
                <Descriptions.Item label="Payment">
                  <Tag color={order.payment === 'Confirmed' ? 'success' : 'error'}>{order.payment}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag style={{ borderRadius: 20, background: `${statusColor[order.status]}22`, color: statusColor[order.status], border: `1px solid ${statusColor[order.status]}44` }}>
                    {order.status}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <div style={{ marginTop: 20, padding: '12px 0', borderTop: `1px solid ${borderColor}` }}>
                <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Dispatch Progress</Text>
                <Steps size="small" current={dispatched ? 3 : stepIndex(order.status)}
                  items={[{ title: 'Packing' }, { title: 'Payment' }, { title: 'Verified' }, { title: 'Dispatched' }]}
                />
              </div>
            </Card>
          </motion.div>
        </Col>

        {/* ── Right: Dispatch Verification ────────────────────────────────── */}
        <Col xs={24} lg={14}>
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            <Card
              title={<Text strong style={{ color: textColor }}>Dispatch Verification</Text>}
              style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
              styles={{ body: { padding: 16 } }}
            >
              <Form form={form} layout="vertical" size="small">
                {/* Row 1: Transport, Boxes, Weight, Dispatch Type */}
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Transport Name" name="transport">
                      <Input placeholder="e.g. Fast Cargo" defaultValue={order.transport !== '-' ? order.transport : ''} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Box Count (Verify)" name="boxes">
                      <Input type="number" defaultValue={order.boxes} prefix={<InboxOutlined />} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Weight (Verify)" name="weight">
                      <Input placeholder="kg" defaultValue={order.weight} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Dispatch Type" name="dispatchType">
                      <Select
                        placeholder="Select dispatch type"
                        value={dispatchType}
                        onChange={(v) => { setDispatchType(v); setVerifiedProducts(new Set()); }}
                      >
                        <Option value="Full Dispatch">Full Dispatch</Option>
                        <Option value="Partial Dispatch">Partial Dispatch</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Product Details table — shows when dispatch type selected */}
                {dispatchType && (
                  <div style={{ marginBottom: 16, border: `1px solid #B11E6A33`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ background: 'linear-gradient(135deg,#B11E6A18,#B11E6A08)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space size={8}>
                        <InboxOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>Product Details — {order.id}</Text>
                        <Tag color={dispatchType === 'Partial Dispatch' ? 'orange' : 'blue'} style={{ borderRadius: 12, fontSize: 11 }}>
                          {dispatchType}
                        </Tag>
                      </Space>
                      <Text style={{ fontSize: 12, color: isDark ? '#aaa' : '#888' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                        {verifiedProducts.size} / {products.length} verified
                      </Text>
                    </div>
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={products}
                      style={{ borderRadius: 0 }}
                      columns={[
                        { title: 'Product Name', dataIndex: 'name', render: (v) => <Text strong>{v}</Text> },
                        { title: 'Qty', dataIndex: 'qty', render: (v) => v.toLocaleString() },
                        { title: 'Rate (₹)', dataIndex: 'rate', render: (v) => `₹${v}` },
                        { title: 'Boxes', dataIndex: 'boxes', render: (v) => <Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} /><Text>{v}</Text></Space> },
                        {
                          title: 'Status', key: 'status',
                          render: (_, row) => verifiedProducts.has(row.key)
                            ? <Tag color="success" style={{ borderRadius: 20 }}>Verified</Tag>
                            : <Tag color="default" style={{ borderRadius: 20 }}>Pending</Tag>,
                        },
                        {
                          title: 'Action', key: 'action',
                          render: (_, row) => (
                            <Button size="small" icon={<CheckSquareOutlined />}
                              style={verifiedProducts.has(row.key) ? { borderColor: '#52c41a', color: '#52c41a' } : { background: '#B11E6A', border: 'none', color: '#fff' }}
                              onClick={() => toggleVerify(row.key, row.itemId)}
                            >
                              {verifiedProducts.has(row.key) ? 'Unverify' : 'Verify'}
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </div>
                )}

                {/* Box Photos (multiple, uploaded immediately) */}
                <Row gutter={12}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Open Box Photos">
                      <Upload listType="picture" multiple beforeUpload={(file) => handleBoxPhotoUpload('open', file)} accept="image/*">
                        <Button icon={<CameraOutlined />} block>Open Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Closed Box Photos">
                      <Upload listType="picture" multiple beforeUpload={(file) => handleBoxPhotoUpload('close', file)} accept="image/*">
                        <Button icon={<CameraOutlined />} block>Close Box</Button>
                      </Upload>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Invoice */}
                <div style={{ background: sectionBg, border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FileDoneOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                    <Text strong style={{ color: textColor, fontSize: 13 }}>Invoice</Text>
                  </div>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Invoice Number" name="invoiceNumber" style={{ marginBottom: 8 }}>
                        <Input placeholder="e.g. INV-2024-001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item label="Invoice Date" name="invoiceDate" style={{ marginBottom: 8 }}>
                        <DatePicker style={{ width: '100%' }} placeholder="Select date" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Upload Invoice" name="invoiceFile" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList} style={{ marginBottom: 8 }}>
                        <Upload listType="picture" maxCount={3} customRequest={makeUpload('dispatch/invoices')} accept=".pdf,.jpg,.jpeg,.png">
                          <Button icon={<UploadOutlined />} block style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                            Upload Invoice (PDF / Image)
                          </Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Button icon={<FileDoneOutlined />} onClick={handleVerifyInvoice} style={{ borderColor: '#1677ff', color: '#1677ff' }}>
                        AI Verify Invoice
                      </Button>
                      {invoiceVerdict && (
                        <div style={{ marginTop: 8 }}>
                          <Tag color={invoiceVerdict.verdict === 'verified' ? 'success' : invoiceVerdict.verdict === 'failed' ? 'error' : 'warning'}>
                            {invoiceVerdict.verdict.toUpperCase()} · {invoiceVerdict.score}
                          </Tag>
                          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12 }}>
                            {invoiceVerdict.checks.map((c, i) => (
                              <li key={i} style={{ color: c.pass ? '#52c41a' : '#ff4d4f' }}>{c.pass ? '✓' : '✗'} {c.label}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </Col>
                  </Row>
                </div>

                {/* Notify Options */}
                <div style={{ background: isDark ? '#161622' : '#fffaf8', border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <Text strong style={{ color: textColor, fontSize: 13, display: 'block', marginBottom: 10 }}>
                    <BellOutlined style={{ color: '#B11E6A', marginRight: 6 }} />Notify on Dispatch
                  </Text>
                  <Space direction="vertical" size={8}>
                    <Checkbox checked={notifyAuto} onChange={(e) => setNotifyAuto(e.target.checked)} style={{ color: textColor }}>
                      Auto-notify Sales person &amp; Customer
                    </Checkbox>
                    <Checkbox checked={notifyWhatsApp} onChange={(e) => setNotifyWhatsApp(e.target.checked)} style={{ color: textColor }}>
                      <WhatsAppOutlined style={{ color: '#25D366', marginRight: 4 }} />Send WhatsApp notification
                    </Checkbox>
                  </Space>
                </div>
              </Form>

              {/* ── Action Buttons ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Button icon={<PrinterOutlined />} onClick={handlePrintDispatchDetails}>
                  Print Dispatch Details
                </Button>
                <Button icon={<SaveOutlined />} style={{ borderColor: '#B11E6A', color: '#B11E6A' }} onClick={handleSaveDraft}>
                  Save as Draft
                </Button>
                <Button
                  type="primary"
                  icon={<CarOutlined />}
                  disabled={order.payment !== 'Confirmed' || dispatched || !allProductsVerified}
                  style={{ background: (order.payment === 'Confirmed' && !dispatched && allProductsVerified) ? 'linear-gradient(135deg,#B11E6A,#D85C9E)' : undefined, border: 'none' }}
                  onClick={handleConfirmDispatch}
                >
                  {dispatched ? 'Dispatched ✓' : 'Confirm Dispatch'}
                </Button>
              </div>

              {/* ════════════════════════════════════════════════════════════
                  POST-DISPATCH SECTION — Lorry Receipt + Tracking
                  Shown always; prominently after Confirm Dispatch
              ═══════════════════════════════════════════════════════════════ */}
              <Divider style={{ margin: '20px 0 16px' }}>
                <Text style={{ fontSize: 11, color: '#999', letterSpacing: 1, textTransform: 'uppercase' }}>
                  After Dispatch — Lorry Receipt &amp; Tracking
                </Text>
              </Divider>

              {/* Lorry Receipt Upload */}
              <div style={{ background: sectionBg, border: `1px solid #B11E6A33`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <UploadOutlined style={{ color: '#B11E6A', fontSize: 16 }} />
                  <Text strong style={{ color: textColor, fontSize: 13 }}>Lorry Receipt (Manual Upload)</Text>
                  {lrUploaded && <Tag color="success" style={{ borderRadius: 12 }}>Uploaded</Tag>}
                </div>

                <Upload
                  listType="picture"
                  fileList={lrFileList}
                  maxCount={3}
                  customRequest={makeUpload('dispatch/lr')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={({ fileList }) => {
                    setLrFileList(fileList);
                    if (fileList.length > 0 && !aiParsed) {
                      enqueueSnackbar('Lorry receipt uploaded. Click "AI Parse Receipt" to extract details automatically.', { variant: 'info' });
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />} block style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}>
                    Upload Lorry Receipt (PDF / Image)
                  </Button>
                </Upload>

                {/* AI Parse — shown once receipt is uploaded */}
                {lrUploaded && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Space>
                        <ThunderboltOutlined style={{ color: '#B11E6A' }} />
                        <Text strong style={{ color: textColor }}>AI Receipt Parser</Text>
                        <Tag color="purple" style={{ fontSize: 10 }}>Auto-extract details</Tag>
                      </Space>
                      <Button
                        type="primary"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        loading={aiParsing}
                        style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' }}
                        onClick={handleAIParse}
                      >
                        {aiParsing ? 'Parsing…' : 'AI Parse Receipt'}
                      </Button>
                    </div>

                    {/* Extracted / Editable Fields */}
                    {aiParsed && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <Text style={{ fontSize: 12, color: '#52c41a', fontWeight: 600 }}>
                            <CheckCircleOutlined style={{ marginRight: 4 }} />AI extracted details — review &amp; edit if needed
                          </Text>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setLrEditMode(!lrEditMode)}
                            style={{ borderColor: '#B11E6A55', color: '#B11E6A' }}
                          >
                            {lrEditMode ? 'View Summary' : 'Edit Details'}
                          </Button>
                        </div>

                        <Form form={lrForm} layout="vertical" size="small">
                          {lrEditMode ? (
                            <Row gutter={12}>
                              <Col xs={24} sm={12}>
                                <Form.Item label="LR Number" name="lrNumber">
                                  <Input placeholder="e.g. LR-78921" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="LR Date" name="lrDate">
                                  <Input placeholder="YYYY-MM-DD" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Transport Name" name="transportName">
                                  <Input placeholder="e.g. Fast Cargo Pvt Ltd" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="No. of Packages" name="packages">
                                  <Input placeholder="30" prefix={<InboxOutlined />} />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="From City" name="fromCity">
                                  <Input placeholder="Coimbatore" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="To City" name="toCity">
                                  <Input placeholder="Mumbai" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Weight" name="weight">
                                  <Input placeholder="45.5 Kg" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Freight Amount" name="freight">
                                  <Input placeholder="₹2,100" />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item label="Estimated Delivery" name="estimatedDelivery">
                                  <Input placeholder="YYYY-MM-DD" />
                                </Form.Item>
                              </Col>
                            </Row>
                          ) : (
                            <Descriptions bordered size="small" column={2} style={{ borderRadius: 8 }}>
                              <Descriptions.Item label="LR Number"><Text strong style={{ color: '#B11E6A' }}>{aiParsed.lrNumber}</Text></Descriptions.Item>
                              <Descriptions.Item label="LR Date">{aiParsed.lrDate}</Descriptions.Item>
                              <Descriptions.Item label="Transport">{aiParsed.transportName}</Descriptions.Item>
                              <Descriptions.Item label="Packages"><Space size={4}><InboxOutlined style={{ color: '#B11E6A' }} />{aiParsed.packages}</Space></Descriptions.Item>
                              <Descriptions.Item label="From → To">{aiParsed.fromCity} → {aiParsed.toCity}</Descriptions.Item>
                              <Descriptions.Item label="Weight">{aiParsed.weight}</Descriptions.Item>
                              <Descriptions.Item label="Freight">{aiParsed.freight}</Descriptions.Item>
                              <Descriptions.Item label="Est. Delivery">{aiParsed.estimatedDelivery}</Descriptions.Item>
                            </Descriptions>
                          )}
                        </Form>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Tracking via Lorry Service */}
              <div style={{ background: sectionBg, border: `1px solid #B11E6A22`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <LinkOutlined style={{ color: '#B11E6A', fontSize: 15 }} />
                  <Text strong style={{ color: textColor, fontSize: 13 }}>Tracking via Lorry Service</Text>
                </div>
                <Form form={trackingForm} layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col xs={24} sm={14}>
                      <Form.Item label="Tracking URL (from lorry service web app)" name="trackingUrl" style={{ marginBottom: 8 }}>
                        <Input
                          placeholder="https://fastcargo.in/track/LR-78921"
                          prefix={<LinkOutlined style={{ color: '#B11E6A' }} />}
                          addonAfter={
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, color: '#B11E6A' }}
                              onClick={() => {
                                const url = document.querySelector('input[placeholder*="track"]')?.value;
                                if (url) window.open(url, '_blank');
                              }}
                            >
                              Open
                            </Button>
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={10}>
                      <Form.Item label="LR / Tracking Number" name="trackingLR" style={{ marginBottom: 8 }}>
                        <Input placeholder="e.g. LR-78921" defaultValue={aiParsed?.lrNumber || ''} />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </div>

              {/* ── Finished Dispatch ── */}
              <div style={{ background: finishedDispatch ? '#52c41a15' : isDark ? '#1a1a2a' : '#fff9fb', border: `1.5px solid ${finishedDispatch ? '#52c41a44' : '#B11E6A44'}`, borderRadius: 12, padding: 16 }}>
                <div style={{ marginBottom: 10 }}>
                  <Text strong style={{ color: textColor, fontSize: 13 }}>
                    <BellOutlined style={{ color: finishedDispatch ? '#52c41a' : '#B11E6A', marginRight: 6 }} />
                    Finished Dispatch — Final Notification
                  </Text>
                  <div style={{ marginTop: 6, fontSize: 12, color: isDark ? '#aaa' : '#666' }}>
                    Clicking this will notify <strong>{order.salesPerson}</strong> (Sales) and <strong>{order.client}</strong> (Customer) that the order has been dispatched and is on the way.
                  </div>
                </div>
                {finishedDispatch ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52c41a', fontWeight: 600 }}>
                    <CheckCircleOutlined />
                    Notifications sent to Sales ({order.salesPerson}) &amp; Customer ({order.client})
                  </div>
                ) : (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<WhatsAppOutlined />}
                    style={{ background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14 }}
                    onClick={handleFinishedDispatch}
                  >
                    Finished Dispatch — Notify Sales &amp; Customer
                  </Button>
                )}
              </div>

            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
}
