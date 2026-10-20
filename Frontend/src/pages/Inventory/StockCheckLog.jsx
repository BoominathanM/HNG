import { useMemo, useState } from 'react';
import { Card, Table, Tag, Button, Input, Select, Space, Typography, DatePicker, Tooltip, Empty } from 'antd';
import {
  SafetyCertificateOutlined, UserOutlined, SearchOutlined, FileExcelOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { enqueueSnackbar } from 'notistack';
import dayjs from 'dayjs';
import html2pdf from 'html2pdf.js';
import { useGetStockHistoryQuery, useLazyGetStockHistoryQuery } from '../../store/api/apiSlice';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { formatQty } from '../../utils/numberFormat';

const { Text } = Typography;
const { Option } = Select;

// Export pulls every record matching the current filters (not just the visible page), capped
// so a wide-open range can't stall the browser.
const EXPORT_LIMIT = 5000;

// A4 landscape with 8mm margins — the PDF's printable area, used both by html2pdf and by the
// row-height measurement that splits the log into pages.
const PDF_MARGIN_MM = 8;
const PDF_INNER_W_MM = 297 - PDF_MARGIN_MM * 2;
const PDF_INNER_H_MM = 210 - PDF_MARGIN_MM * 2;

const toLogRow = (m) => {
  const hasCounts = m.qtyBefore != null && m.qtyAfter != null;
  // Rounded so bulk-unit (Litres/Kg) checks don't show floating-point noise.
  const diff = hasCounts ? Number((m.qtyAfter - m.qtyBefore).toFixed(6)) : null;
  return {
    key: m._id,
    item: m.itemId?.itemName || '—',
    unit: m.itemId?.unit || '',
    qty: m.qty,
    systemCount: hasCounts ? m.qtyBefore : null,
    physicalCount: hasCounts ? m.qtyAfter : null,
    diff,
    result: diff == null || diff === 0 ? '—' : diff < 0 ? 'Missing' : 'Extra',
    reasonType: m.reasonType || '—',
    reason: m.reason || '—',
    notes: m.notes || '',
    checkedBy: m.createdBy?.fullName || '—',
    date: m.createdAt ? dayjs(m.createdAt).format('DD MMM YYYY') : '—',
    time: m.createdAt ? dayjs(m.createdAt).format('hh:mm A') : '—',
    approvalStatus: m.approvalStatus,
    approvedBy: m.approvedBy?.fullName || '',
    approvedAt: m.approvedAt ? dayjs(m.approvedAt).format('DD MMM YYYY, hh:mm A') : '',
  };
};

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

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Scoped to .scl-pdf — the <style> rides along into html2pdf's on-page overlay while rendering.
const PDF_CSS = `
  .scl-pdf { font-family: Arial, sans-serif; line-height: 1.35; color: #111; background: #fff; }
  .scl-pdf .scl-head { padding-bottom: 8px; }
  .scl-pdf .scl-title { font-size: 15px; font-weight: bold; color: #B11E6A; }
  .scl-pdf .scl-sub { font-size: 10px; color: #555; margin-top: 3px; line-height: 1.5; }
  .scl-pdf table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .scl-pdf th { border: 1px solid #999; background: #f5e6ee; padding: 5px 4px; font-size: 9.5px; text-align: left; }
  .scl-pdf td { border: 1px solid #ccc; padding: 4px; font-size: 9.5px; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
  .scl-pdf .c { text-align: center; }
  .scl-pdf .note { color: #666; font-size: 8.5px; margin-top: 2px; }
  .scl-pdf .miss { color: #cf1322; font-weight: bold; }
  .scl-pdf .extra { color: #d46b08; font-weight: bold; }
`;

const PDF_COLS = `
  <colgroup>
    <col style="width:3.5%"/><col style="width:9%"/><col style="width:14%"/><col style="width:6.5%"/>
    <col style="width:6.5%"/><col style="width:7%"/><col style="width:6.5%"/><col style="width:22%"/>
    <col style="width:10%"/><col style="width:15%"/>
  </colgroup>`;

const PDF_THEAD = `
  <thead><tr>
    <th class="c">#</th><th>Date &amp; Time</th><th>Item</th><th class="c">System</th><th class="c">Physical</th>
    <th class="c">Difference</th><th class="c">Reason Type</th><th>Reason / Notes</th><th>Checked By</th><th>Approval</th>
  </tr></thead>`;

const pdfRowHtml = (r, i) => `
  <tr>
    <td class="c">${i + 1}</td>
    <td>${esc(r.date)}<br/>${esc(r.time)}</td>
    <td><b>${esc(r.item)}</b></td>
    <td class="c">${r.systemCount == null ? '—' : esc(`${formatQty(r.systemCount)} ${r.unit}`)}</td>
    <td class="c">${r.physicalCount == null ? '—' : esc(`${formatQty(r.physicalCount)} ${r.unit}`)}</td>
    <td class="c"><span class="${r.result === 'Missing' ? 'miss' : r.result === 'Extra' ? 'extra' : ''}">${r.diff == null ? esc(`${formatQty(r.qty)} ${r.unit}`) : esc(`${r.diff > 0 ? '+' : ''}${formatQty(r.diff)} ${r.unit}`)}</span>${r.result !== '—' ? `<div class="note">${r.result}</div>` : ''}</td>
    <td class="c">${esc(r.reasonType)}</td>
    <td>${esc(r.reason)}${r.notes ? `<div class="note">Note: ${esc(r.notes)}</div>` : ''}</td>
    <td>${esc(r.checkedBy)}</td>
    <td>${esc(r.approvalStatus)}${r.approvedBy ? `<div class="note">by ${esc(r.approvedBy)}${r.approvedAt ? `<br/>${esc(r.approvedAt)}` : ''}</div>` : ''}</td>
  </tr>`;

const pdfPageHtml = (headHtml, rowsHtml) =>
  `<style>${PDF_CSS}</style><div class="scl-pdf">${headHtml}<table>${PDF_COLS}${PDF_THEAD}<tbody>${rowsHtml}</tbody></table></div>`;

// html2pdf paints its source onto ONE canvas before slicing it into pages, so a long log would
// both blow past the browser's canvas-size limit and get rows cut in half at page edges.
// Instead: measure every row at the PDF's printable width, pack rows into page-sized chunks
// (each chunk repeating the column header), and render the chunks one by one into one PDF.
const exportLogToPdf = async (rows, subtitle, filename) => {
  const headHtml = `<div class="scl-head"><div class="scl-title">Stock Check Log — Known &amp; Unknown Reasons</div><div class="scl-sub">${subtitle}</div></div>`;
  const rowHtml = rows.map(pdfRowHtml);

  const probe = document.createElement('div');
  probe.style.cssText = `position:fixed;left:-100000px;top:0;width:${PDF_INNER_W_MM}mm;`;
  probe.innerHTML = pdfPageHtml(headHtml, rowHtml.join(''));
  document.body.appendChild(probe);
  const pageH = probe.offsetWidth * (PDF_INNER_H_MM / PDF_INNER_W_MM) - 6;
  const headH = probe.querySelector('.scl-head').offsetHeight;
  const theadH = probe.querySelector('thead').offsetHeight;
  const rowHeights = [...probe.querySelectorAll('tbody tr')].map((tr) => tr.offsetHeight);
  document.body.removeChild(probe);

  const pages = [];
  let current = [];
  let used = headH + theadH;
  rowHeights.forEach((h, i) => {
    if (current.length && used + h > pageH) {
      pages.push(current);
      current = [];
      used = theadH;
    }
    current.push(i);
    used += h;
  });
  pages.push(current);

  const pageEls = pages.map((idxs, p) => {
    const el = document.createElement('div');
    el.innerHTML = pdfPageHtml(p === 0 ? headHtml : '', idxs.map((i) => rowHtml[i]).join(''));
    return el;
  });

  let worker = html2pdf()
    .set({
      margin: PDF_MARGIN_MM,
      filename,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    })
    .from(pageEls[0])
    .toPdf();
  pageEls.slice(1).forEach((el) => {
    worker = worker.get('pdf').then((pdf) => { pdf.addPage(); }).from(el).toContainer().toCanvas().toPdf();
  });
  await worker
    .get('pdf')
    .then((pdf) => {
      const total = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= total; i += 1) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Page ${i} of ${total}`, 297 - PDF_MARGIN_MM, 210 - 3, { align: 'right' });
      }
    })
    .save();
};

const REASON_LABELS = { all: 'All Reasons', Known: 'Known', Unknown: 'Unknown', None: 'No Reason (Extra)' };
const STATUS_LABELS = { all: 'All Status', Pending: 'Pending', Approved: 'Approved', Rejected: 'Rejected' };

// Inventory → Live Staff Checking → every discrepancy a stock check submitted (one CHECK
// StockMovement per item), with the reason given and its approval outcome. Paged server-side so
// the full log stays reachable; Excel/PDF export everything matching the active filters.
export default function StockCheckLog() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#2a2a3e' : '#f0f0f0';

  const [dateRange, setDateRange] = useState(null);
  const [search, setSearch] = useState('');
  const [reasonType, setReasonType] = useState('all');
  const [status, setStatus] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(null); // 'excel' | 'pdf' | null
  const debouncedSearch = useDebouncedValue(search);

  const filterParams = useMemo(() => {
    const p = { type: 'CHECK' };
    // Local start/end of day, so a check made just after midnight IST lands on the right day.
    if (dateRange?.[0] && dateRange?.[1]) {
      p.dateFrom = dateRange[0].startOf('day').toISOString();
      p.dateTo = dateRange[1].endOf('day').toISOString();
    }
    if (reasonType !== 'all') p.reasonType = reasonType;
    if (status !== 'all') p.approvalStatus = status;
    if (debouncedSearch.trim()) p.search = debouncedSearch.trim();
    return p;
  }, [dateRange, reasonType, status, debouncedSearch]);

  // Page snaps back to 1 whenever the filters change, without an extra fetch of the stale page.
  const filterKey = JSON.stringify(filterParams);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;

  const { data, isFetching } = useGetStockHistoryQuery({ ...filterParams, page, limit: pageSize });
  const rows = useMemo(() => (data?.data || []).map(toLogRow), [data]);
  const total = data?.total || 0;
  const [fetchAllLogs] = useLazyGetStockHistoryQuery();

  const filterSummary = () => {
    const parts = [
      dateRange?.[0] && dateRange?.[1]
        ? `Period: ${dateRange[0].format('DD MMM YYYY')} – ${dateRange[1].format('DD MMM YYYY')}`
        : 'Period: All dates',
    ];
    if (reasonType !== 'all') parts.push(`Reason: ${REASON_LABELS[reasonType]}`);
    if (status !== 'all') parts.push(`Approval: ${status}`);
    if (debouncedSearch.trim()) parts.push(`Search: "${debouncedSearch.trim()}"`);
    return parts;
  };

  const fileStem = () => (dateRange?.[0] && dateRange?.[1]
    ? `Stock_Check_Log_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}`
    : `Stock_Check_Log_${dayjs().format('YYYY-MM-DD')}`);

  const loadAllRows = async () => {
    const res = await fetchAllLogs({ ...filterParams, page: 1, limit: EXPORT_LIMIT }).unwrap();
    if ((res?.total || 0) > EXPORT_LIMIT) {
      enqueueSnackbar(`Only the latest ${EXPORT_LIMIT} of ${res.total} records were exported — narrow the date range for the rest.`, { variant: 'warning' });
    }
    return (res?.data || []).map(toLogRow);
  };

  const handleExport = async (kind) => {
    setExporting(kind);
    try {
      const all = await loadAllRows();
      if (!all.length) {
        enqueueSnackbar('No stock check records to export for these filters', { variant: 'info' });
        return;
      }
      if (kind === 'excel') {
        const headers = ['S.No', 'Date', 'Time', 'Item', 'Unit', 'System Count', 'Physical Count', 'Difference', 'Result', 'Reason Type', 'Reason', 'Notes', 'Checked By', 'Approval', 'Approved / Rejected By', 'Approved / Rejected At'];
        const body = all.map((r, i) => [
          i + 1, r.date, r.time, r.item, r.unit,
          r.systemCount ?? '', r.physicalCount ?? '', r.diff ?? '', r.result === '—' ? '' : r.result,
          r.reasonType === '—' ? '' : r.reasonType, r.reason === '—' ? '' : r.reason, r.notes,
          r.checkedBy, r.approvalStatus, r.approvedBy, r.approvedAt,
        ]);
        exportToExcel(headers, body, `${fileStem()}.csv`);
      } else {
        const subtitle = [...filterSummary(), `${all.length} record${all.length === 1 ? '' : 's'}`, `Generated ${dayjs().format('DD MMM YYYY, hh:mm A')}`]
          .map(esc).join(' · ');
        await exportLogToPdf(all, subtitle, `${fileStem()}.pdf`);
      }
    } catch (err) {
      enqueueSnackbar(err?.data?.message || 'Export failed — please try again', { variant: 'error' });
    } finally {
      setExporting(null);
    }
  };

  const columns = [
    { title: 'Item', dataIndex: 'item', render: (v) => <Text strong style={{ fontSize: 13 }}>{v}</Text> },
    {
      title: 'Qty', dataIndex: 'qty', align: 'center',
      render: (v, r) => (
        <Space direction="vertical" size={0} align="center">
          <Text>{formatQty(v)} {r.unit}</Text>
          {r.result !== '—' && (
            <Text style={{ fontSize: 11, fontWeight: 600, color: r.result === 'Missing' ? '#ff4d4f' : '#fa8c16' }}>{r.result}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'System → Physical', key: 'counts', align: 'center',
      render: (_, r) => (r.systemCount == null
        ? <Text type="secondary">—</Text>
        : <Text style={{ fontSize: 13 }}>{formatQty(r.systemCount)} → <Text strong>{formatQty(r.physicalCount)}</Text></Text>),
    },
    {
      title: 'Reason Type', dataIndex: 'reasonType', align: 'center',
      render: (v) => (v === 'Unknown'
        ? <Tag color="error" style={{ borderRadius: 12 }}>Unknown</Tag>
        : v === 'Known'
          ? <Tag color="success" style={{ borderRadius: 12 }}>Known</Tag>
          : <Text type="secondary">—</Text>),
    },
    {
      title: 'Reason', dataIndex: 'reason',
      render: (v, r) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{v}</Text>
          {r.notes && <Text type="secondary" style={{ fontSize: 11 }}>Note: {r.notes}</Text>}
        </Space>
      ),
    },
    { title: 'Checked By', dataIndex: 'checkedBy', render: (v) => <Space size={4}><UserOutlined style={{ fontSize: 12 }} />{v}</Space> },
    { title: 'Date', dataIndex: 'date' },
    { title: 'Time', dataIndex: 'time' },
    {
      title: 'Approval', dataIndex: 'approvalStatus', align: 'center',
      render: (v, r) => (
        <Space direction="vertical" size={0} align="center">
          <Tag color={v === 'Approved' ? 'success' : v === 'Rejected' ? 'error' : 'warning'} style={{ borderRadius: 12 }}>{v}</Tag>
          {r.approvedBy && (
            <Tooltip title={r.approvedAt}>
              <Text type="secondary" style={{ fontSize: 11 }}>by {r.approvedBy}</Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)', marginTop: 16 }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <SafetyCertificateOutlined style={{ color: '#B11E6A' }} />
          <Text strong style={{ color: textColor }}>Stock Check Log — Known &amp; Unknown Reasons</Text>
          <Tag color="purple" style={{ borderRadius: 20 }}>Super Admin / Admin only</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{total} record{total === 1 ? '' : 's'}</Text>
        </Space>
        <Space wrap>
          <Tooltip title={`Download all ${total} matching record${total === 1 ? '' : 's'} (every page) as Excel`}>
            <Button
              icon={<FileExcelOutlined />}
              style={{ color: '#52c41a', borderColor: '#52c41a44' }}
              loading={exporting === 'excel'}
              disabled={!total || !!exporting}
              onClick={() => handleExport('excel')}
            >
              Excel
            </Button>
          </Tooltip>
          <Tooltip title={`Download all ${total} matching record${total === 1 ? '' : 's'} (every page) as PDF`}>
            <Button
              icon={<FilePdfOutlined />}
              style={{ color: '#B11E6A', borderColor: '#B11E6A44' }}
              loading={exporting === 'pdf'}
              disabled={!total || !!exporting}
              onClick={() => handleExport('pdf')}
            >
              PDF
            </Button>
          </Tooltip>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ borderRadius: 8, maxWidth: '100%' }}
            allowClear
          />
        </Space>
      </div>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
          placeholder="Search item, reason, note, checked by…"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260, maxWidth: '100%', borderRadius: 8 }}
        />
        <Select value={reasonType} onChange={setReasonType} style={{ width: 170 }}>
          {Object.entries(REASON_LABELS).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
        </Select>
        <Select value={status} onChange={setStatus} style={{ width: 140 }}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <Option key={v} value={v}>{l}</Option>)}
        </Select>
      </div>
      <Table
        dataSource={rows}
        size="small"
        loading={isFetching}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty description="No stock check records for these filters" /> }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (t, [from, to]) => `${from}–${to} of ${t}`,
          onChange: (p, size) => {
            if (size !== pageSize) {
              setPageSize(size);
              setPageState({ key: filterKey, page: 1 });
            } else {
              setPageState({ key: filterKey, page: p });
            }
          },
        }}
        columns={columns}
      />
    </Card>
  );
}
