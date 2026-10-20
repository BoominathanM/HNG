import { Modal, Form, Select, Input, Typography, Tag, Space, Spin, Alert, Timeline } from 'antd';
import { useSelector } from 'react-redux';
import { enqueueSnackbar } from 'notistack';
import dayjs from 'dayjs';
import { useGetAssigneeTaskQuery, useUpdateAssigneeTaskStatusMutation } from '../../store/api/apiSlice';
import {
  ASSIGNEE_TASK_STATUSES, assigneeStatusColor, deadlineColor, isAssigneeTaskClosed,
  fmtEndDate, assigneeDeadline, canUpdateAssigneeTask, pillStyle,
} from '../../utils/assigneeTask';

const { Text, Paragraph } = Typography;

// Update a "Task to Assignee" task's status (Open / In Progress / Completed / Closed).
// Completed/Closed need remarks — that's what stops the assignee's alert, and the remarks show
// in Reports → Assignee Task Report. Opened from the alert toast (AlertListener), the header's
// My Tasks drawer and Task Management → Assignee Tasks; always re-reads the task by id so the
// form starts from its live status.
export default function AssigneeTaskStatusModal({ open, taskId, onClose, onUpdated }) {
  const currentUser = useSelector((s) => s.auth.user);
  const isDark = useSelector((s) => s.theme.isDark);
  const [form] = Form.useForm();
  const statusWatch = Form.useWatch('status', form);
  const { data, isFetching, error } = useGetAssigneeTaskQuery(taskId, { skip: !open || !taskId, refetchOnMountOrArgChange: true });
  const task = data?.data || null;
  const [updateStatus, { isLoading: saving }] = useUpdateAssigneeTaskStatusMutation();
  const canUpdate = canUpdateAssigneeTask(currentUser, task);
  const needsRemarks = isAssigneeTaskClosed(statusWatch);

  const handleOk = async () => {
    if (!task) return;
    try {
      const vals = await form.validateFields();
      if (vals.status === task.status && !String(vals.remarks || '').trim()) {
        enqueueSnackbar(`Task is already ${task.status}`, { variant: 'info' });
        return;
      }
      await updateStatus({ id: task._id, status: vals.status, remarks: vals.remarks || '' }).unwrap();
      enqueueSnackbar(
        isAssigneeTaskClosed(vals.status)
          ? `${task.taskCode} marked ${vals.status} — its alert has stopped`
          : `${task.taskCode} updated to ${vals.status}`,
        { variant: 'success' },
      );
      onUpdated?.(vals.status);
      onClose?.();
    } catch (err) {
      if (err?.errorFields) return;
      enqueueSnackbar(err?.data?.message || err?.data || 'Failed to update task status', { variant: 'error' });
    }
  };

  const deadline = task ? assigneeDeadline(task) : '';
  const subColor = isDark ? '#aaa' : '#888';

  return (
    <Modal
      title={task ? `Update Task Status — ${task.taskCode}` : 'Update Task Status'}
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Update Status"
      okButtonProps={{ loading: saving, disabled: !task || !canUpdate, style: { background: 'linear-gradient(135deg,#B11E6A,#D85C9E)', border: 'none' } }}
      width={Math.min(520, window.innerWidth - 32)}
      destroyOnHidden
      zIndex={1400}
    >
      {isFetching && !task ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : !task ? (
        <Alert type="error" showIcon title={error?.data?.message || error?.data || 'Task not found'} />
      ) : (
        <>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: isDark ? '#161622' : '#fafafa', border: `1px solid ${isDark ? '#2a2a3e' : '#f0f0f0'}`, marginBottom: 14 }}>
            <Paragraph style={{ marginBottom: 8, whiteSpace: 'pre-wrap' }}>{task.description}</Paragraph>
            <Space size={[6, 6]} wrap>
              <Tag style={pillStyle(assigneeStatusColor[task.status] || '#888')}>{task.status}</Tag>
              <Tag style={pillStyle('#B11E6A')}>End Date: {fmtEndDate(task.endDate)}</Tag>
              {deadline && <Tag style={pillStyle(deadlineColor[deadline] || '#888')}>{deadline}</Tag>}
            </Space>
            <div style={{ marginTop: 8, fontSize: 12, color: subColor }}>
              Assigned by <Text strong style={{ fontSize: 12 }}>{task.createdByName || '—'}</Text> to{' '}
              <Text strong style={{ fontSize: 12 }}>{task.assigneeName || '—'}</Text> on {dayjs(task.createdAt).format('DD MMM YYYY, hh:mm A')}
            </div>
            {task.remarks && (
              <div style={{ marginTop: 6, fontSize: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Remarks: </Text>{task.remarks}
              </div>
            )}
          </div>

          {!canUpdate && (
            <Alert type="info" showIcon style={{ marginBottom: 12 }} title="Only the assignee, the person who assigned it, or an admin can update this task." />
          )}

          {/* Keyed on the live status so a refetch (or reopening) starts the form from it. */}
          <Form
            key={`${task._id}:${task.status}`}
            form={form}
            layout="vertical"
            disabled={!canUpdate}
            initialValues={{ status: task.status, remarks: '' }}
          >
            <Form.Item label="Status" name="status" rules={[{ required: true, message: 'Select a status' }]}>
              <Select options={ASSIGNEE_TASK_STATUSES.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item
              label={needsRemarks ? 'Remarks (required)' : 'Remarks (optional)'}
              name="remarks"
              rules={needsRemarks ? [{ required: true, whitespace: true, message: `Remarks are required to mark the task ${statusWatch}` }] : []}
              extra={needsRemarks ? 'Marking it Completed/Closed stops the task alert. These remarks appear in Reports → Assignee Task Report.' : undefined}
            >
              <Input.TextArea rows={3} maxLength={1000} showCount placeholder={needsRemarks ? 'What was done / why it is closed' : 'Optional note'} />
            </Form.Item>
          </Form>

          {(task.statusHistory || []).length > 0 && (
            <>
              <Text strong style={{ fontSize: 12 }}>History</Text>
              <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 8, paddingTop: 4 }}>
                <Timeline
                  items={[...task.statusHistory].reverse().map((h, i) => ({
                    key: i,
                    color: assigneeStatusColor[h.status] || 'gray',
                    content: (
                      <div style={{ fontSize: 12 }}>
                        <Text strong style={{ fontSize: 12 }}>{h.status}</Text>
                        <span style={{ color: subColor }}> · {h.byName || '—'} · {dayjs(h.at).format('DD MMM, hh:mm A')}</span>
                        {h.remarks && <div style={{ whiteSpace: 'pre-wrap' }}>{h.remarks}</div>}
                      </div>
                    ),
                  }))}
                />
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
