import { useState, useMemo, useRef } from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Space, Tag, Empty, DatePicker } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { useGetDamagedReportQuery } from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const exportToExcel = (headers, rows, filename) => {
  const bom = '﻿';
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const exportRefToPdf = async (ref, filename) => {
  if (!ref?.current) return;
  await html2pdf()
    .from(ref.current)
    .set({
      margin: 6,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a3', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'] },
    })
    .save();
};

const dmgTypeColor = { Invoice: '#B11E6A', Quotation: '#7c3aed' };

// Shared "Damaged Report" — every line-item quantity reduction ("less"/damage) recorded
// through Billing's Edit Pricing modal (DamageLog). Rendered identically as a Reports tab and
// an Inventory tab (same component, same endpoint, so the two never drift apart).
export default function DamagedReport() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';

  const [dateRange, setDateRange] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const contentRef = useRef(null);

  const dateParams = useMemo(() => (
    dateRange?.[0] && dateRange?.[1]
      ? { startDate: dateRange[0].startOf('day').toISOString(), endDate: dateRange[1].endOf('day').toISOString() }
      : undefined
  ), [dateRange]);

  const { data: raw } = useGetDamagedReportQuery(dateParams);
  const apiData = raw || { data: [], summary: {}, chartData: [] };
  const summary = apiData.summary || {};
  const chartData = apiData.chartData || [];

  const filteredRows = (apiData.data || []).filter((r) => {
    const matchType = typeFilter === 'all' || r.docType === typeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || r.client?.toLowerCase().includes(q)
      || r.docNo?.toLowerCase().includes(q)
      || r.orderNo?.toLowerCase().includes(q)
      || r.product?.toLowerCase().includes(q)
      || r.reason?.toLowerCase().includes(q)
      || r.doneBy?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const exportExcel = () => {
    const headers = ['Date', 'Type', 'Doc No', 'Order No', 'Client', 'Product', 'Old Qty', 'New Qty', 'Qty Reduced', 'Rate', 'GST %', 'Amount (Excl GST)', 'Amount (Incl GST)', 'Unit Cost', 'Cost Loss', 'Revenue Loss', 'Reason', 'Done By'];
    const rows = filteredRows.map((r) => [
      r.date, r.docType, r.docNo, r.orderNo, r.client, r.product,
      r.oldQty, r.newQty, r.qtyReduced, r.rate, r.gstPct,
      r.amountExclGst, r.amountInclGst, r.unitCost, r.costLoss, r.revenueLoss,
      r.reason, r.doneBy,
    ]);
    exportToExcel(headers, rows, 'Damaged_Report.csv');
  };
  const exportPdf = () => exportRefToPdf(contentRef, 'Damaged_Report.pdf');

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 100, fixed: 'left', render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: 'Document', key: 'doc', width: 170,
      render: (_, r) => (
        <div>
          <Tag style={{ background: `${dmgTypeColor[r.docType] || '#888'}18`, color: dmgTypeColor[r.docType] || '#888', border: `1px solid ${dmgTypeColor[r.docType] || '#888'}44`, borderRadius: 20, fontSize: 10 }}>{r.docType}</Tag>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#B11E6A' }}>{r.docNo || '—'}</div>
          {r.orderNo ? <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#888' }}>{r.orderNo}</div> : null}
        </div>
      ),
    },
    { title: 'Client', dataIndex: 'client', key: 'client', width: 150, render: (v) => <Text strong style={{ fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: 'Product', key: 'product', width: 180,
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{r.product || '—'}</Text>
          {r.isKit ? <Tag style={{ marginLeft: 4, fontSize: 10, background: '#7c3aed18', color: '#7c3aed', border: 'none' }}>Kit</Tag> : null}
        </div>
      ),
    },
    {
      title: 'Qty Reduced', key: 'qty', width: 120, align: 'center',
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>
          <Text delete type="secondary" style={{ fontSize: 12 }}>{r.oldQty}</Text>
          {' → '}
          <Text strong style={{ color: '#d46b08' }}>{r.newQty}</Text>
          <div style={{ fontSize: 11, color: '#d46b08', fontWeight: 700 }}>−{r.qtyReduced}</div>
        </Text>
      ),
    },
    { title: 'Rate', dataIndex: 'rate', key: 'rate', width: 90, align: 'right', render: (v) => <Text style={{ fontSize: 12 }}>₹{(v ?? 0).toLocaleString()}</Text> },
    { title: 'Amount ↓ (Excl GST)', dataIndex: 'amountExclGst', key: 'amountExclGst', width: 130, align: 'right', render: (v) => <Text style={{ fontSize: 12, color: '#d46b08' }}>₹{(v ?? 0).toLocaleString()}</Text> },
    { title: 'Amount ↓ (Incl GST)', dataIndex: 'amountInclGst', key: 'amountInclGst', width: 130, align: 'right', render: (v) => <Text style={{ fontSize: 12, color: '#d46b08' }}>₹{(v ?? 0).toLocaleString()}</Text> },
    { title: 'Cost Loss', dataIndex: 'costLoss', key: 'costLoss', width: 110, align: 'right', render: (v) => <Text style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>₹{(v ?? 0).toLocaleString()}</Text> },
    { title: 'Revenue Loss', dataIndex: 'revenueLoss', key: 'revenueLoss', width: 120, align: 'right', render: (v) => <Text style={{ fontSize: 12, color: '#8a1652' }}>₹{(v ?? 0).toLocaleString()}</Text> },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', width: 240, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    { title: 'Done By', dataIndex: 'doneBy', key: 'doneBy', width: 130, fixed: 'right', render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
  ];

  const statCards = [
    { label: 'Reduction Entries', value: summary.count ?? 0, color: '#B11E6A', sub: 'Lines lessed / damaged' },
    { label: 'Total Qty Reduced', value: (summary.totalQtyReduced ?? 0).toLocaleString(), color: '#d46b08', sub: 'Units removed from billing' },
    { label: 'Amount ↓ (Incl GST)', value: `₹${(summary.totalAmountInclGst ?? 0).toLocaleString()}`, color: '#eb2f96', sub: `₹${(summary.totalAmountExclGst ?? 0).toLocaleString()} excl GST` },
    { label: 'Cost-Basis Loss', value: `₹${(summary.totalCostLoss ?? 0).toLocaleString()}`, color: '#ff4d4f', sub: 'Hits Net Profit in P&L' },
    { label: 'Revenue-Basis Loss', value: `₹${(summary.totalRevenueLoss ?? 0).toLocaleString()}`, color: '#8a1652', sub: 'Lost billing value (memo)' },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Space wrap>
            <FilterOutlined style={{ color: '#B11E6A' }} />
            <Text strong style={{ color: textColor, fontSize: 13 }}>Filter by:</Text>
            <RangePicker value={dateRange} onChange={setDateRange} style={{ borderRadius: 8 }} allowClear />
            <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 160 }}>
              <Option value="all">All Documents</Option>
              <Option value="Invoice">Invoice</Option>
              <Option value="Quotation">Quotation</Option>
            </Select>
            <Input
              prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
              placeholder="Search doc, client, product, reason, done by…"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280, borderRadius: 8 }}
            />
          </Space>
          <Space>
            <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }} onClick={exportExcel}>Excel</Button>
            <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }} onClick={exportPdf}>PDF</Button>
          </Space>
        </div>
      </Card>

      <div ref={contentRef}>
        <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
          {statCards.map((s, i) => (
            <Col xs={12} sm={8} md={5} key={s.label} style={{ flex: '1 1 160px' }}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                  <Text style={{ fontSize: 10, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 3 }}>{s.label}</Text>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <Text style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</Text>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {chartData.length > 0 && (
          <Card style={{ borderRadius: 14, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
            <Title level={5} style={{ color: textColor, marginTop: 0, marginBottom: 12 }}>Monthly Damage / Reduction Loss</Title>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="costLoss" name="Cost-Basis Loss" fill="#ff4d4f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenueLoss" name="Revenue-Basis Loss" fill="#8a1652" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Title level={5} style={{ color: textColor, margin: 0 }}>Damaged / Reduced Quantity — Billing</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>{filteredRows.length} records</Text>
          </div>
          <Table
            size="small"
            bordered
            scroll={{ x: 'max-content' }}
            dataSource={filteredRows}
            columns={columns}
            rowKey="key"
            pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }}
            locale={{ emptyText: <Empty description="No quantity reductions recorded for this range" /> }}
          />
        </Card>
      </div>
    </div>
  );
}
