import { useState } from 'react';
import { Badge, Button, Drawer, Segmented, Empty, Tag, Typography, Space, Tooltip } from 'antd';
import { CarryOutOutlined, EditOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useGetAssigneeTasksQuery } from '../../store/api/apiSlice';
import AssigneeTaskStatusModal from './AssigneeTaskStatusModal';
import {
  assigneeStatusColor, deadlineColor, isAssigneeTaskClosed, fmtEndDate, assigneeDeadline, pillStyle,
} from '../../utils/assigneeTask';

const { Text, Paragraph } = Typography;

// Header "My Tasks" — the "Task to Assignee" tasks assigned to the logged-in user. Assignees
// can be any user (not only Task Management staff), so this is how someone without Task
// Management access still sees their tasks and marks them Completed/Closed with remarks.
// Hidden until the user has been assigned at least one such task.
export default function MyAssigneeTasks() {
  const isDark = useSelector((s) => s.theme.isDark);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('open');
  const [statusTaskId, setStatusTaskId] = useState(null);
  const { data } = useGetAssigneeTasksQuery({ scope: 'mine' }, { pollingInterval: 60000 });
  const tasks = data?.data || [];
  const openTasks = tasks.filter((t) => !isAssigneeTaskClosed(t.status));
  if (!tasks.length) return null;

  const list = (view === 'open' ? openTasks : view === 'done' ? tasks.filter((t) => isAssigneeTaskClosed(t.status)) : tasks)
    .slice()
    .sort((a, b) => {
      // Open work first, nearest End Date first; finished work newest first.
      const ac = isAssigneeTaskClosed(a.status); const bc = isAssigneeTaskClosed(b.status);
      if (ac !== bc) return ac ? 1 : -1;
      if (!ac) return String(a.endDate || '9999').localeCompare(String(b.endDate || '9999'));
      return new Date(b.closedAt || b.updatedAt) - new Date(a.closedAt || a.updatedAt);
    });
  const overdueCount = openTasks.filter((t) => assigneeDeadline(t) === 'Overdue').length;

  return (
    <>
      <Tooltip title={openTasks.length ? `${openTasks.length} open task${openTasks.length === 1 ? '' : 's'} assigned to you` : 'My Tasks'}>
        <motion.div whileTap={{ scale: 0.9 }} style={{ display: 'inline-flex' }}>
          <Badge count={openTasks.length} size="small" style={{ background: overdueCount ? '#ff4d4f' : '#fa8c16' }} overflowCount={99}>
            <Button
              type="text"
              shape="circle"
              icon={<CarryOutOutlined />}
              onClick={() => setOpen(true)}
              style={{
                color: open ? '#B11E6A' : (isDark ? '#ccc' : '#555'),
                background: open ? 'rgba(177,30,106,0.12)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(177,30,106,0.06)'),
                fontSize: 19,
              }}
            />
          </Badge>
        </motion.div>
      </Tooltip>

      <Drawer
        title={(
          <Space size={8}>
            <CarryOutOutlined style={{ color: '#B11E6A' }} />
            My Tasks
            {overdueCount > 0 && <Tag style={pillStyle('#ff4d4f')}>{overdueCount} overdue</Tag>}
          </Space>
        )}
        open={open}
        onClose={() => setOpen(false)}
        size={Math.min(440, window.innerWidth)}
        styles={{ body: { padding: 16 } }}
      >
        <Segmented
          block
          value={view}
          onChange={setView}
          style={{ marginBottom: 14 }}
          options={[
            { value: 'open', label: `Open (${openTasks.length})` },
            { value: 'done', label: `Done (${tasks.length - openTasks.length})` },
            { value: 'all', label: `All (${tasks.length})` },
          ]}
        />
        {list.length === 0 ? (
          <Empty description={view === 'open' ? 'No open tasks — all caught up' : 'Nothing here yet'} />
        ) : (
          <Space orientation="vertical" size={10} style={{ width: '100%' }}>
            {list.map((t) => {
              const deadline = assigneeDeadline(t);
              const sc = assigneeStatusColor[t.status] || '#888';
              return (
                <div
                  key={t._id}
                  style={{
                    padding: '10px 12px', borderRadius: 10, borderLeft: `3px solid ${sc}`,
                    background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text strong style={{ color: '#B11E6A', fontFamily: 'monospace', fontSize: 12 }}>{t.taskCode}</Text>
                    <Tag style={pillStyle(sc)}>{t.status}</Tag>
                  </div>
                  <Paragraph style={{ marginBottom: 6, whiteSpace: 'pre-wrap', fontSize: 13 }} ellipsis={{ rows: 3, expandable: true, symbol: 'more' }}>
                    {t.description}
                  </Paragraph>
                  <Space size={[6, 6]} wrap style={{ marginBottom: 6 }}>
                    <Tag style={pillStyle('#B11E6A')}>End: {fmtEndDate(t.endDate)}</Tag>
                    {deadline && <Tag style={pillStyle(deadlineColor[deadline] || '#888')}>{deadline}</Tag>}
                  </Space>
                  <div style={{ fontSize: 11, color: isDark ? '#aaa' : '#888' }}>
                    From {t.createdByName || '—'} · {dayjs(t.createdAt).format('DD MMM YYYY, hh:mm A')}
                  </div>
                  {t.remarks && (
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Remarks: </Text>{t.remarks}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <Button size="small" icon={<EditOutlined />} onClick={() => setStatusTaskId(t._id)} style={{ borderColor: '#B11E6A', color: '#B11E6A' }}>
                      Update Status
                    </Button>
                  </div>
                </div>
              );
            })}
          </Space>
        )}
      </Drawer>

      <AssigneeTaskStatusModal open={!!statusTaskId} taskId={statusTaskId} onClose={() => setStatusTaskId(null)} />
    </>
  );
}
