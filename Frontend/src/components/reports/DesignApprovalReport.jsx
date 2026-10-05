import { useState, useMemo, useRef } from 'react';
import { Row, Col, Card, Table, Button, Select, Input, Typography, Space, Tag, Empty, DatePicker } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { useGetEmergencyApprovalsReportQuery } from '../../store/api/apiSlice';

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

const statusColor = { Pending: '#fa8c16', Approved: '#52c41a', Rejected: '#ff4d4f' };
const DESIGN_COLOR = '#7c3aed';

// Operations > "Approved/Rejected Report" — the Reports > Approval Report narrowed to the
// "Design / Sticker / Printing" type (same endpoint with type=design, same rows and columns),
// so every Sales / Ops Head approval AND rejection of an uploaded Sticker/Box/Ziplock/Butter
// Paper/... design is reviewable from Operations without Reports-module access.
export default function DesignApprovalReport() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const subColor = isDark ? '#aaa' : '#888';

  const [dateRange, setDateRange] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const contentRef = useRef(null);

  const queryParams = useMemo(() => ({
    type: 'design',
    ...(dateRange?.[0] && dateRange?.[1]
      ? { startDate: dateRange[0].startOf('day').toISOString(), endDate: dateRange[1].endOf('day').toISOString() }
      : {}),
  }), [dateRange]);

  const { data: raw, isFetching } = useGetEmergencyApprovalsReportQuery(queryParams);
  const allRows = useMemo(() => raw?.data || [], [raw]);

  const typeOptions = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.designType).filter(Boolean))).sort(),
    [allRows],
  );

  // Type + search narrow the stat cards too; the status filter only narrows the table, so the
  // cards keep showing the Pending / Approved / Rejected split.
  const scopedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((r) => {
      const matchType = typeFilter === 'all' || r.designType === typeFilter;
      const matchSearch = !q
        || r.orderCode?.toLowerCase().includes(q)
        || r.clientName?.toLowerCase().includes(q)
        || r.sentBy?.toLowerCase().includes(q)
        || r.reason?.toLowerCase().includes(q)
        || r.approver1Name?.toLowerCase().includes(q)
        || r.approver2Name?.toLowerCase().includes(q)
        || r.approvedReason?.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [allRows, typeFilter, search]);
  const filteredRows = useMemo(
    () => scopedRows.filter((r) => statusFilter === 'all' || r.status === statusFilter),
    [scopedRows, statusFilter],
  );

  const exportExcel = () => {
    const headers = ['Design Type', 'Order Code', 'Client', 'Sent Date', 'Sent Time', 'Sent By', 'Sent Reason', 'Approved/Rejected Date', 'Approved/Rejected Time', 'Approver 1 Role', 'Approver 1', 'Approver 1 Decision', 'Approver 1 Date', 'Approver 1 Reason', 'Approver 2 Role', 'Approver 2', 'Approver 2 Decision', 'Approver 2 Date', 'Approver 2 Reason', 'Status'];
    const rows = filteredRows.map((r) => [
      r.designType, r.orderCode, r.clientName, r.sentDate, r.sentTime, r.sentBy, r.reason,
      r.approvedDate, r.approvedTime,
      r.approver1Role, r.approver1Name, r.approver1Decision, r.approver1Date, r.approver1Reason,
      r.approver2Role, r.approver2Name, r.approver2Decision, r.approver2Date, r.approver2Reason,
      r.status,
    ]);
    exportToExcel(headers, rows, 'Design_Approval_Report.csv');
  };
  const exportPdf = () => exportRefToPdf(contentRef, 'Design_Approval_Report.pdf');

  const renderApprover = (name, role, decision, date, reason) => (
    <div>
      <Text style={{ fontSize: 12 }}>{name || '—'}</Text>
      <div style={{ fontSize: 11, color: subColor }}>{role}</div>
      <Tag style={{ marginTop: 2, fontSize: 10, background: `${statusColor[decision] || '#888'}18`, color: statusColor[decision] || '#888', border: 'none' }}>
        {decision}{date ? ` · ${date}` : ''}
      </Tag>
      {reason && (
        <div style={{ fontSize: 11, color: '#ff4d4f', maxWidth: 220, whiteSpace: 'normal', marginTop: 2 }}>Reason: {reason}</div>
      )}
    </div>
  );

  const columns = [
    {
      title: 'Type', dataIndex: 'designType', key: 'designType', width: 150, fixed: 'left',
      render: (v) => (
        <Tag style={{ background: `${DESIGN_COLOR}18`, color: DESIGN_COLOR, border: `1px solid ${DESIGN_COLOR}44`, borderRadius: 20, fontSize: 11 }}>
          {v || 'Sticker'}
        </Tag>
      ),
    },
    {
      title: 'Order', key: 'order', width: 170,
      render: (_, r) => (
        <div>
          <Text strong style={{ fontSize: 12, color: '#B11E6A' }}>{r.orderCode || '—'}</Text>
          <div style={{ fontSize: 11, color: subColor }}>{r.clientName || ''}</div>
        </div>
      ),
    },
    {
      title: 'Sent (Date / Time)', key: 'sent', width: 140,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 12 }}>{r.sentDate || '—'}</div>
          <div style={{ fontSize: 11, color: subColor }}>{r.sentTime || ''}</div>
        </div>
      ),
    },
    {
      title: 'Sent By', key: 'sentBy', width: 150,
      render: (_, r) => (
        <div>
          <Text style={{ fontSize: 12 }}>{r.sentBy || '—'}</Text>
          <div style={{ fontSize: 11, color: subColor }}>{r.sentByRole || r.raisedByTeam}</div>
        </div>
      ),
    },
    { title: 'Sent Reason', dataIndex: 'reason', key: 'reason', width: 220, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: 'Approved / Rejected (Date / Time)', key: 'approved', width: 170,
      render: (_, r) => (r.approvedDate || r.approvedTime) ? (
        <div>
          <div style={{ fontSize: 12 }}>{r.approvedDate || '—'}</div>
          <div style={{ fontSize: 11, color: subColor }}>{r.approvedTime || ''}</div>
        </div>
      ) : <Text style={{ fontSize: 12, color: '#aaa' }}>—</Text>,
    },
    {
      title: 'Approver 1', key: 'approver1', width: 200,
      render: (_, r) => renderApprover(r.approver1Name, r.approver1Role, r.approver1Decision, r.approver1Date, r.approver1Reason),
    },
    {
      title: 'Approver 2', key: 'approver2', width: 200,
      render: (_, r) => renderApprover(r.approver2Name, r.approver2Role, r.approver2Decision, r.approver2Date, r.approver2Reason),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110, fixed: 'right',
      render: (v) => <Tag style={{ background: `${statusColor[v] || '#888'}18`, color: statusColor[v] || '#888', border: `1px solid ${statusColor[v] || '#888'}44`, borderRadius: 20, fontWeight: 700, fontSize: 11 }}>{v}</Tag>,
    },
  ];

  const statCards = [
    { label: 'Total Design Approvals', value: scopedRows.length, color: '#B11E6A', sub: 'Sales & Ops Head sign-offs' },
    { label: 'Pending', value: scopedRows.filter((r) => r.status === 'Pending').length, color: '#fa8c16', sub: 'Awaiting decision' },
    { label: 'Approved', value: scopedRows.filter((r) => r.status === 'Approved').length, color: '#52c41a', sub: 'Fully approved' },
    { label: 'Rejected', value: scopedRows.filter((r) => r.status === 'Rejected').length, color: '#ff4d4f', sub: 'Rejected by Sales / Ops Head' },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Space wrap>
            <FilterOutlined style={{ color: '#B11E6A' }} />
            <Text strong style={{ color: textColor, fontSize: 13 }}>Filter by:</Text>
            <RangePicker value={dateRange} onChange={setDateRange} style={{ borderRadius: 8 }} allowClear />
            <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 170 }}>
              <Option value="all">All Design Types</Option>
              {typeOptions.map((t) => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 150 }}>
              <Option value="all">All Statuses</Option>
              <Option value="Pending">Pending</Option>
              <Option value="Approved">Approved</Option>
              <Option value="Rejected">Rejected</Option>
            </Select>
            <Input
              prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
              placeholder="Search order, client, approver, reason…"
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 250, borderRadius: 8 }}
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
            <Col xs={12} sm={6} key={s.label}>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '12px 14px' } }}>
                  <Text style={{ fontSize: 10, color: subColor, display: 'block', marginBottom: 3 }}>{s.label}</Text>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <Text style={{ fontSize: 10, color: '#aaa' }}>{s.sub}</Text>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
            <Title level={5} style={{ color: textColor, margin: 0 }}>Design / Sticker / Printing — Approved / Rejected</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>{filteredRows.length} records</Text>
          </div>
          <Table
            size="small"
            bordered
            loading={isFetching}
            scroll={{ x: 'max-content' }}
            dataSource={filteredRows}
            columns={columns}
            rowKey="key"
            pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10 }}
            locale={{ emptyText: <Empty description="No design approvals or rejections found for this range" /> }}
          />
        </Card>
      </div>
    </div>
  );
}
