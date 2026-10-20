import { useState } from 'react';
import { Row, Col, Card, Table, Tag, Button, Select, Input, Typography, Segmented, Empty, Tooltip } from 'antd';
import { SearchOutlined, EditOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useGetAssigneeTasksQuery } from '../../store/api/apiSlice';
import AssigneeTaskStatusModal from '../../components/tasks/AssigneeTaskStatusModal';
import {
  ASSIGNEE_TASK_STATUSES, assigneeStatusColor, deadlineColor, fmtEndDate, endDateKey,
  assigneeDeadline, canUpdateAssigneeTask, pillStyle,
} from '../../utils/assigneeTask';

const { Text } = Typography;

// Task Management → Assignee Tasks — every "Task to Assignee" task the user can see (all of
// them for Admin/Management/Manager/Head, otherwise the ones assigned to or by them), with
// Update Status for the assignee / assigner / admins. Created from New Task → Task for =
// Task to Assignee; the Reports → Assignee Task Report has the full history + alert status.
export default function AssigneeTasksTab() {
  const isDark = useSelector((s) => s.theme.isDark);
  const currentUser = useSelector((s) => s.auth.user);
  const cardBg = isDark ? '#1E1E2E' : '#ffffff';
  const mutedColor = isDark ? '#aaa' : '#888';

  const [scope, setScope] = useState('all');
  const [statusFilter, setStatusFilter] = useState('open');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [statusTaskId, setStatusTaskId] = useState(null);

  const { data, isFetching, refetch } = useGetAssigneeTasksQuery({ scope });
  const tasks = data?.data || [];

  const q = search.trim().toLowerCase();
  const rowsNoStatus = tasks.filter((t) => (assigneeFilter === 'all' || t.assigneeName === assigneeFilter)
    && (!q || [t.taskCode, t.description, t.assigneeName, t.createdByName, t.remarks]
      .some((v) => String(v || '').toLowerCase().includes(q))));
  const matchesStatus = (t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return t.status === 'Open' || t.status === 'In Progress';
    if (statusFilter === 'overdue') return assigneeDeadline(t) === 'Overdue';
    return t.status === statusFilter;
  };
  const rows = rowsNoStatus.filter(matchesStatus);
  const assigneeOptions = Array.from(new Set(tasks.map((t) => t.assigneeName).filter(Boolean))).sort();

  const statCards = [
    ...ASSIGNEE_TASK_STATUSES.map((s) => ({ key: s, label: s, color: assigneeStatusColor[s], value: rowsNoStatus.filter((t) => t.status === s).length })),
    { key: 'overdue', label: 'Overdue', color: deadlineColor.Overdue, value: rowsNoStatus.filter((t) => assigneeDeadline(t) === 'Overdue').length },
  ];

  const columns = [
    {
      title: 'Task', key: 'task', width: 140, fixed: 'left',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: (_, t) => (
        <div>
          <Text strong style={{ fontSize: 12, color: '#B11E6A', fontFamily: 'monospace' }}>{t.taskCode}</Text>
          <div style={{ fontSize: 11, color: mutedColor }}>{dayjs(t.createdAt).format('DD MMM YYYY, hh:mm A')}</div>
        </div>
      ),
    },
    {
      title: 'Description', dataIndex: 'description', key: 'description', width: 280,
      render: (v) => <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }} ellipsis={{ tooltip: v }}>{v}</Text>,
    },
    { title: 'Assigned By', dataIndex: 'createdByName', key: 'createdByName', width: 130, render: (v) => <Text style={{ fontSize: 12 }}>{v || '—'}</Text> },
    {
      title: 'Assignee', key: 'assignee', width: 170,
      render: (_, t) => (
        <div>
          <Text strong style={{ fontSize: 12 }}>{t.assigneeName || '—'}</Text>
          <div style={{ fontSize: 11, color: mutedColor }}>{[t.assigneeRole, t.assigneeDepartment].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    {
      title: 'End Date', key: 'endDate', width: 130,
      sorter: (a, b) => endDateKey(a.endDate).localeCompare(endDateKey(b.endDate)),
      render: (_, t) => {
        const d = assigneeDeadline(t);
        return (
          <div>
            <Text style={{ fontSize: 12 }}>{fmtEndDate(t.endDate)}</Text>
            {d && <div><Tag style={{ ...pillStyle(deadlineColor[d] || '#888'), marginTop: 2 }}>{d}</Tag></div>}
          </div>
        );
      },
    },
    {
      title: 'Status', key: 'status', width: 170,
      render: (_, t) => {
        const last = (t.statusHistory || [])[t.statusHistory?.length - 1];
        return (
          <div>
            <Tag style={pillStyle(assigneeStatusColor[t.status] || '#888')}>{t.status}</Tag>
            {last && <div style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>{dayjs(last.at).format('DD MMM, hh:mm A')}{last.byName ? ` · ${last.byName}` : ''}</div>}
          </div>
        );
      },
    },
    {
      title: 'Remarks', dataIndex: 'remarks', key: 'remarks', width: 220,
      render: (v) => (v ? <Text style={{ fontSize: 12, whiteSpace: 'pre-wrap' }} ellipsis={{ tooltip: v }}>{v}</Text> : <Text style={{ fontSize: 12, color: mutedColor }}>—</Text>),
    },
    {
      title: 'Action', key: 'action', width: 130, fixed: 'right',
      render: (_, t) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          disabled={!canUpdateAssigneeTask(currentUser, t)}
          onClick={() => setStatusTaskId(t._id)}
          style={{ borderColor: '#B11E6A', color: '#B11E6A' }}
        >
          Update Status
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, border: 'none', background: cardBg, marginBottom: 14, boxShadow: '0 2px 12px rgba(177,30,106,0.06)' }} styles={{ body: { padding: '12px 16px' } }}>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'All' },
              { value: 'mine', label: 'Assigned to Me' },
              { value: 'by_me', label: 'Assigned by Me' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            popupMatchSelectWidth={false}
            style={{ flex: '0 1 170px', minWidth: 0 }}
            options={[
              { value: 'open', label: 'Open + In Progress' },
              ...ASSIGNEE_TASK_STATUSES.map((s) => ({ value: s, label: s })),
              { value: 'overdue', label: 'Overdue' },
              { value: 'all', label: 'All Statuses' },
            ]}
          />
          <Select
            value={assigneeFilter}
            onChange={setAssigneeFilter}
            showSearch
            popupMatchSelectWidth={false}
            style={{ flex: '1 1 150px', maxWidth: 220, minWidth: 0 }}
            options={[{ value: 'all', label: 'All Assignees' }, ...assigneeOptions.map((n) => ({ value: n, label: n }))]}
          />
          <Input
            prefix={<SearchOutlined style={{ color: '#B11E6A' }} />}
            placeholder="Search task, description, person, remarks…"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '2 1 180px', minWidth: 0, borderRadius: 8 }}
          />
          <Tooltip title="Refresh">
            <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching} />
          </Tooltip>
        </div>
      </Card>

      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        {statCards.map((s) => {
          const selected = statusFilter === s.key;
          return (
            <Col key={s.key} style={{ flex: '1 1 140px' }}>
              <Card
                hoverable
                onClick={() => setStatusFilter(selected ? 'all' : s.key)}
                style={{ borderRadius: 12, border: `1px solid ${selected ? s.color : `${s.color}22`}`, background: `linear-gradient(135deg,${s.color}22,${s.color}08)`, boxShadow: selected ? `0 0 0 2px ${s.color}33` : undefined }}
                styles={{ body: { padding: '10px 14px' } }}
              >
                <Text style={{ fontSize: 11, color: mutedColor, display: 'block' }}>{s.label}</Text>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Card style={{ borderRadius: 14, border: 'none', background: cardBg, boxShadow: '0 4px 20px rgba(177,30,106,0.06)' }} styles={{ body: { padding: 16 } }}>
        <Table
          size="small"
          bordered
          rowKey="_id"
          loading={isFetching}
          dataSource={rows}
          columns={columns}
          scroll={{ x: 'max-content' }}
          pagination={{ showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], defaultPageSize: 10, showTotal: (t) => `${t} tasks` }}
          locale={{ emptyText: <Empty description="No assignee tasks for this filter — create one from New Task → Task to Assignee" /> }}
        />
      </Card>

      <AssigneeTaskStatusModal open={!!statusTaskId} taskId={statusTaskId} onClose={() => setStatusTaskId(null)} />
    </div>
  );
}
