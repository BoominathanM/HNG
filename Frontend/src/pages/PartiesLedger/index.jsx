import React, { useState, useMemo } from 'react';
import {
  Row, Col, Card, Table, Tag, Button, Input, Select, Typography,
  Space, Tabs, DatePicker, Spin, message
} from 'antd';
import {
  SearchOutlined, EyeOutlined, LeftOutlined,
  BookOutlined, ShopOutlined, ArrowUpOutlined,
  WalletOutlined, TeamOutlined,
  PhoneOutlined, MailOutlined, EnvironmentOutlined,
  FileTextOutlined, PrinterOutlined, DownloadOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import dayjs from 'dayjs';
import {
  useGetPartiesQuery,
  useGetPartyLedgerQuery,
  useDeletePartyMutation,
} from '../../store/api/apiSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const PRIMARY = '#B11E6A';
const FONT_SIZE = 13;

export default function PartiesLedger() {
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth.user);
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3a' : '#f0f0f0';

  const [activeTab, setActiveTab] = useState('all');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [allSearch, setAllSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewParty, setViewParty] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // RTK Query — load parties
  const { data: partiesData, isLoading: partiesLoading } = useGetPartiesQuery();
  const [deletePartyMutation] = useDeletePartyMutation();

  const mapParty = (p) => ({
    key: p._id,
    name: p.name,
    type: p.type,
    phone: p.phone,
    email: '',
    address: [p.street, p.city, p.state].filter(Boolean).join(', '),
    gst: p.gstNumber,
    totalPurchase: p.totalSales || 0,
    totalSales: p.totalSales || 0,
    paid: p.received || 0,
    received: p.received || 0,
    pending: p.pending || 0,
    balance: p.runningBalance || 0,
  });

  const allRaw = partiesData?.data || [];
  const supplierList = useMemo(() => allRaw.filter((p) => p.type === 'Supplier').map(mapParty), [allRaw]);
  const customerList = useMemo(() => allRaw.filter((p) => p.type === 'Customer').map(mapParty), [allRaw]);

  // RTK Query — load ledger for selected party
  const { data: ledgerData, isLoading: partyLedgerLoading } = useGetPartyLedgerQuery(
    viewParty?.key,
    { skip: !viewParty }
  );
  const partyLedgerData = ledgerData?.data || [];

  const deleteParty = async (party) => {
    try {
      await deletePartyMutation(party.key).unwrap();
      message.success(`${party.name} deleted`);
    } catch { /* silent */ }
  };

  const openParty = (party) => {
    setViewParty(party);
  };

  const allParties = useMemo(() => [...supplierList, ...customerList], [supplierList, customerList]);

  const totalSupplierPending = supplierList.reduce((s, p) => s + p.pending, 0);
  const totalCustomerPending = customerList.reduce((s, p) => s + p.pending, 0);
  const totalSupplierPaid = supplierList.reduce((s, p) => s + p.paid, 0);
  const totalCustomerReceived = customerList.reduce((s, p) => s + p.received, 0);

  const getLedger = () => {
    let entries = partyLedgerData;
    if (dateRange && dateRange[0] && dateRange[1]) {
      entries = entries.filter(e => {
        const d = dayjs(e.date);
        return d.isAfter(dateRange[0].startOf('day').subtract(1, 'ms')) && d.isBefore(dateRange[1].endOf('day'));
      });
    }
    return entries;
  };

  const downloadLedger = (party) => {
    const entries = partyLedgerData;
    const totalDebit = entries.reduce((s, r) => s + r.debit, 0);
    const totalCredit = entries.reduce((s, r) => s + r.credit, 0);
    const closingBalance = entries.at(-1)?.balance ?? 0;
    const dateFrom = entries[0]?.date || '';
    const dateTo = entries.at(-1)?.date || '';

    const rows = entries.map(e => `
      <tr>
        <td>${e.date}</td>
        <td>${e.particulars}</td>
        <td>${e.vch_type}</td>
        <td>${e.vch_no}</td>
        <td class="num">${e.debit > 0 ? e.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
        <td class="num">${e.credit > 0 ? e.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Ledger - ${party.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 24px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header .company { font-size: 15px; font-weight: bold; }
  .header .address { font-size: 10px; line-height: 1.6; }
  .divider { border-top: 1px solid #000; margin: 6px 0; }
  .party-block { text-align: center; margin: 12px 0; }
  .party-block .pname { font-size: 13px; font-weight: bold; }
  .party-block .pdetail { font-size: 10px; line-height: 1.6; }
  .date-range { text-align: center; font-size: 11px; margin: 8px 0 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { border: 1px solid #000; padding: 5px 8px; background: #f5f5f5; font-size: 11px; text-align: left; }
  td { border: 1px solid #ccc; padding: 4px 8px; font-size: 10.5px; }
  .num { text-align: right; }
  .total-row td { border-top: 2px solid #000; font-weight: bold; background: #fafafa; }
  .closing-row td { font-weight: bold; }
  .balance-row td { border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; }
  .page-title { text-align: right; font-size: 10px; margin-bottom: 4px; }
  @media print {
    body { padding: 12px; }
    @page { margin: 1cm; size: A4; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="company">HEAL N GLOW PRIVATE LIMITED</div>
  <div class="address">
    THADICOMBU ROAD, DINDIGUL - 624 001, TAMIL NADU<br/>
    PH NO : 82480 93571
  </div>
</div>
<div class="divider"></div>
<div class="party-block">
  <div class="pname">${party.name}</div>
  <div class="pdetail">Ledger Account</div>
  ${party.address ? `<div class="pdetail">${party.address}</div>` : ''}
  ${party.phone ? `<div class="pdetail">PH: ${party.phone}</div>` : ''}
  ${party.email ? `<div class="pdetail">Email: ${party.email}</div>` : ''}
  ${party.gst ? `<div class="pdetail">GST/Lic No: ${party.gst}</div>` : ''}
</div>
<div class="date-range">${dateFrom} to ${dateTo}</div>
<div class="page-title">Page 1</div>
<table>
  <thead>
    <tr>
      <th style="width:90px">Date</th>
      <th>Particulars</th>
      <th style="width:80px">Vch Type</th>
      <th style="width:70px">Vch No.</th>
      <th style="width:110px" class="num">Debit</th>
      <th style="width:110px" class="num">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    <tr class="total-row">
      <td colspan="4" style="text-align:right">Total</td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="num">${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="closing-row">
      <td colspan="4" style="text-align:right">By Closing Balance</td>
      <td class="num"></td>
      <td class="num">${Math.abs(closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
    <tr class="balance-row">
      <td colspan="4" style="text-align:right"></td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="num">${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    </tr>
  </tbody>
</table>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const renderPartyView = () => {
    if (!viewParty) return null;
    const ledger = getLedger();
    const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
    const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
    const netBalance = ledger.at(-1)?.balance ?? 0;
    const isSupplier = viewParty.type === 'Supplier';

    const ledgerColumns = [
      {
        title: 'Date', dataIndex: 'date', width: 100,
        render: v => <Text style={{ fontSize: FONT_SIZE }}>{v}</Text>
      },
      {
        title: 'Particulars', dataIndex: 'particulars', width: 200,
        render: v => <Text style={{ fontSize: FONT_SIZE, color: textColor }}>{v}</Text>
      },
      {
        title: 'Vch Type', dataIndex: 'vch_type', width: 90,
        render: t => (
          <Tag
            style={{ borderRadius: 6, fontSize: FONT_SIZE - 1, border: `1px solid ${PRIMARY}22`, background: `${PRIMARY}10`, color: PRIMARY }}
          >
            {t}
          </Tag>
        )
      },
      {
        title: 'Vch No.', dataIndex: 'vch_no', width: 90,
        render: v => <Text style={{ color: PRIMARY, fontWeight: 600, fontSize: FONT_SIZE }}>{v}</Text>
      },
      {
        title: 'Debit (Dr)', dataIndex: 'debit', align: 'right', width: 120,
        render: v => v > 0
          ? <Text style={{ color: '#ff4d4f', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: FONT_SIZE }}>—</Text>
      },
      {
        title: 'Credit (Cr)', dataIndex: 'credit', align: 'right', width: 120,
        render: v => v > 0
          ? <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
          : <Text type="secondary" style={{ fontSize: FONT_SIZE }}>—</Text>
      },
      {
        title: 'Balance', dataIndex: 'balance', align: 'right', width: 120,
        render: v => (
          <Text strong style={{ color: v < 0 ? '#52c41a' : PRIMARY, fontSize: FONT_SIZE }}>
            ₹{Math.abs(v).toLocaleString()}{v < 0 ? ' Cr' : ' Dr'}
          </Text>
        )
      },
    ];

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => { setViewParty(null); setDateRange(null); }}>
              Back to Parties
            </Button>
            <div>
              <Text strong style={{ color: PRIMARY, fontSize: 16 }}>{viewParty.name}</Text>
              <Tag
                style={{ marginLeft: 8, borderRadius: 10, border: `1px solid ${PRIMARY}33`, background: `${PRIMARY}10`, color: PRIMARY }}
              >
                {viewParty.type}
              </Tag>
            </div>
          </Space>
          <Space wrap>
            <DatePicker.RangePicker value={dateRange} onChange={setDateRange} style={{ width: 260 }} />
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadLedger(viewParty)}
              style={{ background: PRIMARY, border: 'none', color: '#fff', fontWeight: 600 }}
            >
              Download PDF
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ borderColor: PRIMARY, color: PRIMARY }}>
              Print
            </Button>
          </Space>
        </div>

        <div style={{ background: isDark ? '#16192a' : '#fafafa', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: `1px solid ${borderColor}` }}>
          <Row gutter={[16, 8]} wrap>
            {viewParty.phone && (
              <Col><Space size={4}><PhoneOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>{viewParty.phone}</Text></Space></Col>
            )}
            {viewParty.email && (
              <Col><Space size={4}><MailOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>{viewParty.email}</Text></Space></Col>
            )}
            {viewParty.address && (
              <Col><Space size={4}><EnvironmentOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>{viewParty.address}</Text></Space></Col>
            )}
            {viewParty.gst && (
              <Col><Space size={4}><FileTextOutlined style={{ color: PRIMARY }} /><Text style={{ fontSize: FONT_SIZE }}>Lic/GST: {viewParty.gst}</Text></Space></Col>
            )}
          </Row>
        </div>

        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {[
            { label: isSupplier ? 'Total Purchases (Dr)' : 'Total Invoiced (Dr)', val: `₹${totalDebit.toLocaleString()}`, color: '#ff4d4f' },
            { label: isSupplier ? 'Total Paid (Cr)' : 'Total Received (Cr)', val: `₹${totalCredit.toLocaleString()}`, color: '#52c41a' },
            { label: 'Net Balance', val: `₹${Math.abs(netBalance).toLocaleString()}${netBalance < 0 ? ' (Adv)' : ''}`, color: PRIMARY },
          ].map(s => (
            <Col xs={8} key={s.label}>
              <Card style={{ borderRadius: 10, border: 'none', background: `${s.color}10` }} styles={{ body: { padding: '10px 14px' } }}>
                <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                <Text strong style={{ color: s.color, fontSize: 16 }}>{s.val}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        <Table
          size="small"
          dataSource={ledger}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: 'No transactions in selected date range.' }}
          scroll={{ x: 750 }}
          columns={ledgerColumns}
          summary={(pageData) => {
            const pgDebit = pageData.reduce((s, r) => s + r.debit, 0);
            const pgCredit = pageData.reduce((s, r) => s + r.credit, 0);
            return (
              <Table.Summary.Row style={{ background: isDark ? '#1a1a2e' : '#fafafa', fontWeight: 700 }}>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <Text strong style={{ fontSize: FONT_SIZE }}>Page Total</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <Text style={{ color: '#ff4d4f', fontWeight: 700, fontSize: FONT_SIZE }}>₹{pgDebit.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text style={{ color: '#52c41a', fontWeight: 700, fontSize: FONT_SIZE }}>₹{pgCredit.toLocaleString()}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  <Text strong style={{ color: PRIMARY, fontSize: FONT_SIZE }}>
                    ₹{Math.abs(ledger.at(-1)?.balance ?? 0).toLocaleString()} Dr
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </div>
    );
  };

  const partiesTableColumns = (type) => [
    {
      title: type === 'Supplier' ? 'Supplier Name' : type === 'Customer' ? 'Customer Name' : 'Party Name',
      dataIndex: 'name',
      render: v => <Text strong style={{ color: PRIMARY, fontSize: FONT_SIZE }}>{v}</Text>
    },
    {
      title: 'Type', dataIndex: 'type', width: 100,
      render: v => (
        <Tag style={{ borderRadius: 10, border: `1px solid ${PRIMARY}33`, background: `${PRIMARY}10`, color: PRIMARY, fontSize: FONT_SIZE - 1 }}>
          {v}
        </Tag>
      )
    },
    {
      title: 'Phone', dataIndex: 'phone', width: 160,
      render: v => <Text style={{ fontSize: FONT_SIZE }}>{v || <Text type="secondary">—</Text>}</Text>
    },
    {
      title: 'Address', dataIndex: 'address',
      render: v => <Text style={{ fontSize: FONT_SIZE }}>{v || <Text type="secondary">—</Text>}</Text>
    },
    {
      title: type === 'Supplier' ? 'Total Purchases' : type === 'Customer' ? 'Total Sales' : 'Total',
      key: 'total', align: 'right', width: 140,
      render: (_, r) => <Text strong style={{ fontSize: FONT_SIZE }}>₹{(r.totalPurchase || r.totalSales || 0).toLocaleString()}</Text>
    },
    {
      title: type === 'Supplier' ? 'Paid' : type === 'Customer' ? 'Received' : 'Paid / Received',
      key: 'paid', align: 'right', width: 130,
      render: (_, r) => <Text style={{ color: '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{(r.paid || r.received || 0).toLocaleString()}</Text>
    },
    {
      title: 'Pending', dataIndex: 'pending', align: 'right', width: 120,
      render: v => <Text style={{ color: v > 0 ? '#ff4d4f' : '#52c41a', fontWeight: 600, fontSize: FONT_SIZE }}>₹{v.toLocaleString()}</Text>
    },
    {
      title: 'Paid %', key: 'balance_bar', width: 110,
      render: (_, r) => {
        const total = r.totalPurchase || r.totalSales || 1;
        const paidVal = r.paid || r.received || 0;
        const pct = Math.min(100, Math.round((paidVal / total) * 100));
        return (
          <div>
            <div style={{ background: borderColor, borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 2 }}>
              <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#52c41a' : PRIMARY, borderRadius: 4 }} />
            </div>
            <Text style={{ fontSize: 11, color: '#888' }}>{pct}% paid</Text>
          </div>
        );
      }
    },
    {
      title: 'Action', key: 'action', fixed: 'right', width: isSuperAdmin ? 210 : 150,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={e => { e.stopPropagation(); openParty(r); }} style={{ color: PRIMARY, padding: '0 4px', fontSize: FONT_SIZE }}>
            Ledger
          </Button>
          <Button size="small" type="link" icon={<DownloadOutlined />} onClick={e => { e.stopPropagation(); downloadLedger(r); }} style={{ color: PRIMARY, padding: '0 4px', fontSize: FONT_SIZE }}>
            Download
          </Button>
          {isSuperAdmin && (
            <Button
              size="small"
              type="link"
              icon={<DeleteOutlined />}
              onClick={e => { e.stopPropagation(); deleteParty(r); }}
              style={{ color: '#ff4d4f', padding: '0 4px', fontSize: FONT_SIZE }}
            >
              Delete
            </Button>
          )}
        </Space>
      )
    }
  ];

  const renderPartiesTable = (parties, search, setSearch, type) => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: FONT_SIZE }}>
          {type === 'Supplier' ? 'Purchase ledger per supplier' : 'Sales & invoice ledger per customer'} — click a row to view full transaction history
        </Text>
        <Input
          prefix={<SearchOutlined />}
          placeholder={`Search ${type.toLowerCase()}s...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220, borderRadius: 8 }}
          allowClear
        />
      </div>
      <Table
        size="small"
        dataSource={parties.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))}
        rowKey="key"
        pagination={{ pageSize: 8 }}
        scroll={{ x: 900 }}
        onRow={r => ({ onClick: () => openParty(r), style: { cursor: 'pointer' } })}
        columns={partiesTableColumns(type)}
      />
    </div>
  );

  return (
    <div className="page-container fade-in">
      <div style={{ marginBottom: 20 }}>
        <PageBreadcrumb title="Parties & Ledger" items={[{ label: 'Parties & Ledger' }]} style={{ marginBottom: 0 }} />
      </div>

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Supplier Pending', value: `₹${totalSupplierPending.toLocaleString()}`, icon: <ShopOutlined />, sub: `${supplierList.filter(p => p.pending > 0).length} suppliers with dues` },
          { label: 'Supplier Paid', value: `₹${totalSupplierPaid.toLocaleString()}`, icon: <WalletOutlined />, sub: 'Total paid to suppliers' },
          { label: 'Customer Pending', value: `₹${totalCustomerPending.toLocaleString()}`, icon: <TeamOutlined />, sub: `${customerList.filter(p => p.pending > 0).length} customers with dues` },
          { label: 'Customer Received', value: `₹${totalCustomerReceived.toLocaleString()}`, icon: <ArrowUpOutlined />, sub: 'Total received from customers' },
        ].map((s, i) => (
          <Col xs={12} sm={6} key={s.label}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderRadius: 12, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '14px 16px' } }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${PRIMARY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: PRIMARY, fontSize: 16 }}>{s.icon}</span>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: '#888', display: 'block' }}>{s.label}</Text>
                    <Text strong style={{ color: PRIMARY, fontSize: 18 }}>{s.value}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', display: 'block' }}>{s.sub}</Text>
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      <Card
        style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }}
        styles={{ body: { padding: '8px 16px 16px' } }}
      >
        {viewParty ? renderPartyView() : (
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'all',
                label: <Space><BookOutlined /> All Parties</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <Text type="secondary" style={{ fontSize: FONT_SIZE }}>All suppliers and customers in one view — click a row to view full transaction history</Text>
                      <Space wrap>
                        <Input
                          prefix={<SearchOutlined />}
                          placeholder="Search all parties..."
                          value={allSearch}
                          onChange={e => setAllSearch(e.target.value)}
                          style={{ width: 220, borderRadius: 8 }}
                          allowClear
                        />
                        <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 130 }}>
                          <Option value="all">All Types</Option>
                          <Option value="Supplier">Suppliers</Option>
                          <Option value="Customer">Customers</Option>
                        </Select>
                      </Space>
                    </div>
                    <Table
                      size="small"
                      dataSource={allParties.filter(p =>
                        (typeFilter === 'all' || p.type === typeFilter) &&
                        (!allSearch || p.name.toLowerCase().includes(allSearch.toLowerCase()))
                      )}
                      rowKey="key"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 900 }}
                      onRow={r => ({ onClick: () => openParty(r), style: { cursor: 'pointer' } })}
                      columns={partiesTableColumns('all')}
                    />
                  </div>
                )
              },
              {
                key: 'suppliers',
                label: <Space><ShopOutlined /> Vendors Ledger</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    {renderPartiesTable(supplierList, supplierSearch, setSupplierSearch, 'Supplier')}
                  </div>
                )
              },
              {
                key: 'customers',
                label: <Space><TeamOutlined /> Customers Ledger</Space>,
                children: (
                  <div style={{ marginTop: 12 }}>
                    {renderPartiesTable(customerList, customerSearch, setCustomerSearch, 'Customer')}
                  </div>
                )
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
