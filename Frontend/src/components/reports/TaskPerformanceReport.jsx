import { useState, useMemo, useRef } from 'react';
import { Row, Col, Card, Table, Button, Typography, Space, Tag, Empty, Rate, DatePicker } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, TrophyOutlined } from '@ant-design/icons';
import {
  BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';
import { useGetTaskPerformanceReportQuery } from '../../store/api/apiSlice';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const PALETTE = ['#B11E6A', '#1890ff', '#52c41a', '#fa8c16', '#7c3aed', '#eb2f96', '#13c2c2', '#faad14'];
const rankBg = (idx) => (idx === 0 ? '#faad14' : idx === 1 ? '#aaa' : idx === 2 ? '#cd7f32' : '#f0f0f0');
const pctTag = (v, good = 70) => ({
  background: v >= good ? '#52c41a15' : v >= good - 30 ? '#fa8c1615' : '#ff4d4f15',
  color: v >= good ? '#52c41a' : v >= good - 30 ? '#fa8c16' : '#ff4d4f',
  border: `1px solid ${v >= good ? '#52c41a33' : v >= good - 30 ? '#fa8c1633' : '#ff4d4f33'}`,
});

const exportToExcel = (headers, rows, filename) => {
  const bom = 'ï»¿';
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

// Shared Task Management department performance report — a per-user completion-rate /
// on-time-rate / rating / efficiency leaderboard with rankings, rendered identically as
// a Reports tab and a Task Management tab (same component, same endpoint, so the two
// never drift apart).
export default function TaskPerformanceReport() {
  const isDark = useSelector((s) => s.theme.isDark);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const textColor = isDark ? '#e0e0e0' : '#1a1a2e';
  const borderColor = isDark ? '#333' : '#f0f0f0';
  const gridColor = isDark ? '#333' : '#f0f0f0';
  const tickColor = isDark ? '#aaa' : '#666';

  const [dateRange, setDateRange] = useState(null);
  const [viewTab, setViewTab] = useState('leaderboard');
  const contentRef = useRef(null);

  const dateParams = useMemo(() => (
    dateRange?.[0] && dateRange?.[1]
      ? { startDate: dateRange[0].startOf('day').toISOString(), endDate: dateRange[1].endOf('day').toISOString() }
      : undefined
  ), [dateRange]);

  const { data, isLoading } = useGetTaskPerformanceReportQuery(dateParams);
  const leaderboard = useMemo(() => (
    (data?.data?.leaderboard || []).map((r, idx) => ({ ...r, color: r.color || PALETTE[idx % PALETTE.length] }))
  ), [data]);
  const monthlyData = data?.data?.monthlyData || [];

  const topPerformer = [...leaderboard].sort((a, b) => b.score - a.score)[0];
  const teamCompleted = leaderboard.reduce((s, p) => s + (p.completed || 0), 0);
  const ratedUsers = leaderboard.filter((p) => p.completed > 0);
  const teamAvgRating = ratedUsers.length
    ? (ratedUsers.reduce((s, p) => s + (p.avgRating || 0), 0) / ratedUsers.length).toFixed(1)
    : '0.0';
  const teamOnTimeRate = ratedUsers.length
    ? Math.round(ratedUsers.reduce((s, p) => s + (p.onTimeRate || 0), 0) / ratedUsers.length)
    : 0;

  const exportExcel = () => {
    const headers = ['Rank', 'Name', 'Role', 'Assigned', 'Completed', 'Pending', 'Completion Rate %', 'On-Time %', 'Avg Rating', 'Avg Efficiency %', 'Score'];
    const rows = [...leaderboard].sort((a, b) => b.score - a.score).map((p) => [
      p.rank, p.name, p.role, p.totalAssigned, p.completed, p.pending, p.completionRate, p.onTimeRate, p.avgRating, p.avgEfficiencyPct, p.score,
    ]);
    exportToExcel(headers, rows, 'Task_Management_Performance_Report.csv');
  };
  const exportPdf = () => exportRefToPdf(contentRef, 'Task_Management_Performance_Report.pdf');

  if (isLoading) return <Empty description="Loading performance data..." style={{ padding: 40 }} />;
  if (!topPerformer) return <Empty description="No Task Management users/tasks found" style={{ padding: 40 }} />;

  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <RangePicker value={dateRange} onChange={setDateRange} allowClear onClear={() => setDateRange(null)} />
        <Space>
          <Button icon={<FileExcelOutlined />} style={{ color: '#52c41a', borderColor: '#52c41a44' }} onClick={exportExcel}>Excel</Button>
          <Button icon={<FilePdfOutlined />} style={{ color: '#B11E6A', borderColor: '#B11E6A44' }} onClick={exportPdf}>PDF</Button>
        </Space>
      </div>

      <div ref={contentRef}>
        <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
          {[
            { label: 'Top Performer', value: (topPerformer.name || '—').split(' ')[0], color: '#B11E6A', sub: `Score ${topPerformer.score ?? 0}` },
            { label: 'Team Tasks Completed', value: teamCompleted, color: '#C94F8A', sub: `${leaderboard.length} team members` },
            { label: 'Team Avg Rating', value: `${teamAvgRating} / 5`, color: '#52c41a', sub: 'Auto-rated on completion' },
            { label: 'Team On-Time Rate', value: `${teamOnTimeRate}%`, color: teamOnTimeRate >= 70 ? '#52c41a' : '#fa8c16', sub: 'vs due date' },
          ].map((s, i) => (
            <Col xs={12} sm={6} key={s.label}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Card style={{ borderRadius: 12, border: `1px solid ${s.color}22`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)` }} styles={{ body: { padding: '14px 16px' } }}>
                  <Text style={{ fontSize: 11, color: isDark ? '#aaa' : '#888', display: 'block', marginBottom: 4 }}>{s.label}</Text>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <Text style={{ fontSize: 11, color: '#aaa' }}>{s.sub}</Text>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[['leaderboard', 'Leaderboard'], ['monthly', 'Monthly Trend']].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setViewTab(k)} style={{
              padding: '6px 18px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
              border: `1.5px solid ${viewTab === k ? '#B11E6A' : borderColor}`,
              background: viewTab === k ? '#B11E6A18' : 'transparent',
              color: viewTab === k ? '#B11E6A' : isDark ? '#aaa' : '#666',
            }}>{lbl}</button>
          ))}
        </div>

        {viewTab === 'leaderboard' && (
          <Row gutter={[14, 14]}>
            <Col xs={24} lg={10}>
              <Card title={<Text strong style={{ color: textColor }}>Performance Score</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px 16px' } }}>
                <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 40)}>
                  <BarChart data={sorted} layout="vertical" barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} width={100} tickFormatter={(v) => v.split(' ')[0]} />
                    <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                    <Bar dataKey="score" name="Score" radius={[0, 4, 4, 0]}>
                      {sorted.map((p, idx) => <Cell key={idx} fill={p.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card title={<Text strong style={{ color: textColor }}>Task Management — Ranked by Performance</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 0 } }}>
                <Table
                  size="small"
                  dataSource={sorted}
                  pagination={false}
                  rowKey="key"
                  scroll={{ x: 'max-content' }}
                  columns={[
                    {
                      title: '#', key: 'rank', width: 36, align: 'center',
                      render: (_, __, idx) => (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: rankBg(idx), color: idx < 3 ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, margin: '0 auto' }}>
                          {idx === 0 ? <TrophyOutlined style={{ fontSize: 11 }} /> : idx + 1}
                        </div>
                      ),
                    },
                    { title: 'Name', dataIndex: 'name', key: 'name', render: (v, r) => <div><Text style={{ fontSize: 12, fontWeight: 700 }}>{v}</Text><br /><Text style={{ fontSize: 10, color: '#aaa' }}>{r.role}</Text></div> },
                    { title: 'Completed', dataIndex: 'completed', key: 'completed', align: 'center', width: 75, render: (v, r) => <Text style={{ fontSize: 12, fontWeight: 600 }}>{v} / {r.totalAssigned}</Text> },
                    { title: 'Compl. Rate', dataIndex: 'completionRate', key: 'completionRate', align: 'center', width: 80, render: (v) => <Tag style={{ ...pctTag(v), borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{v}%</Tag> },
                    { title: 'On-Time', dataIndex: 'onTimeRate', key: 'onTimeRate', align: 'center', width: 75, render: (v) => <Tag style={{ ...pctTag(v), borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{v}%</Tag> },
                    { title: 'Rating', dataIndex: 'avgRating', key: 'avgRating', width: 100, render: (v) => <Rate disabled allowHalf value={v || 0} style={{ fontSize: 11 }} /> },
                    { title: 'Efficiency', dataIndex: 'avgEfficiencyPct', key: 'avgEfficiencyPct', align: 'center', width: 80, render: (v) => <Tag style={{ ...pctTag(v), borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{v}%</Tag> },
                    { title: 'Score', dataIndex: 'score', key: 'score', align: 'center', width: 70, render: (v, r) => <Text style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{v}</Text> },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        )}

        {viewTab === 'monthly' && (
          monthlyData.length === 0 ? (
            <Empty description="No monthly completion data available" style={{ padding: 40 }} />
          ) : (
            <Card title={<Text strong style={{ color: textColor }}>Month-wise Tasks Completed per User</Text>} style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px 16px' } }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: tickColor, fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: isDark ? '#1E1E2E' : '#fff', borderRadius: 8 }} />
                  <Legend />
                  {leaderboard.map((p) => (
                    <Line key={p.name} type="monotone" dataKey={p.name} stroke={p.color} strokeWidth={2} dot={{ fill: p.color, r: 3 }} name={p.name.split(' ')[0]} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
