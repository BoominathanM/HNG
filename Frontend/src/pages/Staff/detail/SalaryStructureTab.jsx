// Salary Structure tab — GET /admin/staff/salary-structures/staff/{id} returns
// the current structure plus its revision history.
import React, { useMemo, useState } from 'react';
import { Segmented, Select, Skeleton, Table, Typography } from 'antd';
import { FileTextOutlined, CalendarOutlined } from '@ant-design/icons';
import { useGetHrSalaryStructureQuery } from '../../../store/api/apiSlice';
import { pick, asText, fmtDate, fmtMoney, toList, toRecord, salaryFigures, isBlank, isObjectId, BRAND } from '../shared/hrUtils';
import { PanelCard, PanelTitle, IconBadge, EmptyBlock, LoadError } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';
import SalaryTable from '../shared/SalaryTable';

const { Text } = Typography;

const EFFECTIVE_PATHS = ['effectiveFrom', 'effectiveDate', 'fromDate', 'startDate', 'createdAt'];
const NOTE_PATHS = ['note', 'notes', 'remarks', 'reason', 'revisionNote'];

// Current structure first, then older revisions.
const toRevisions = (res) => {
  const root = toRecord(res);
  const current = pick(root, ['current', 'currentStructure', 'activeStructure', 'salaryStructure', 'structure']);
  let history = Array.isArray(res?.data) ? res.data : toList(pick(root, ['history', 'revisions', 'salaryHistory', 'structures']));
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    history = history.filter((r) => !current._id || r._id !== current._id);
    return [current, ...history];
  }
  if (history.length) return history;
  return root && salaryFigures(root).hasLines ? [root] : [];
};

export default function SalaryStructureTab({ staffId, record, staff }) {
  const s = useSurface();
  const [view, setView] = useState('Structure');
  const [revIdx, setRevIdx] = useState(0);
  const { data, isFetching, error, refetch } = useGetHrSalaryStructureQuery(staffId);

  const revisions = useMemo(() => toRevisions(data), [data]);
  const rev = revisions[revIdx] || revisions[0];
  const figures = rev ? salaryFigures(rev) : null;
  // The structure carries its populated template ({ title }); the staff record
  // only has the id.
  const recordTemplate = pick(record, ['salaryTemplate', 'salaryTemplateId', 'templates.salaryTemplate']);
  const templateName = asText(pick(rev, ['salaryTemplate', 'template', 'templateName']))
    || (isObjectId(recordTemplate) ? undefined : asText(recordTemplate));

  const revisionOptions = revisions.map((r, i) => ({
    value: i,
    label: i === 0 ? 'Currently in effect' : `Effective ${fmtDate(pick(r, EFFECTIVE_PATHS)) || `revision ${revisions.length - i}`}`,
  }));

  const historyColumns = [
    { title: 'Effective From', render: (_, r) => fmtDate(pick(r, EFFECTIVE_PATHS)) || '—' },
    { title: 'Gross / Month', align: 'right', render: (_, r) => fmtMoney(salaryFigures(r).gross) || '—' },
    { title: 'Net / Month', align: 'right', render: (_, r) => fmtMoney(salaryFigures(r).net) || '—' },
    { title: 'CTC / Year', align: 'right', render: (_, r) => fmtMoney(salaryFigures(r).ctcYear) || '—' },
    { title: 'Note', ellipsis: true, render: (_, r) => asText(pick(r, NOTE_PATHS)) || '—' },
    { title: 'Status', render: (_, r, i) => (i === 0 ? <Text style={{ color: '#52c41a', fontWeight: 600 }}>Current</Text> : <Text type="secondary">Previous</Text>) },
  ];

  let body;
  if (isFetching) body = <Skeleton active paragraph={{ rows: 8 }} />;
  else if (error) body = <LoadError error={error} onRetry={refetch} />;
  else if (!revisions.length) body = <EmptyBlock icon={<FileTextOutlined />} text="No salary structure assigned to this staff member yet." />;
  else if (view === 'Revision History') {
    body = (
      <div className="table-responsive">
        <Table
          className="staff-table"
          size="middle"
          rowKey={(r, i) => r._id || i}
          dataSource={revisions}
          columns={historyColumns}
          pagination={false}
          onRow={(_, i) => ({ onClick: () => { setRevIdx(i); setView('Structure'); }, style: { cursor: 'pointer' } })}
        />
      </div>
    );
  } else {
    const note = asText(pick(rev, NOTE_PATHS));
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconBadge icon={<FileTextOutlined />} size={28} />
            <Text strong style={{ fontSize: 14.5, color: s.text }}>Compensation Breakdown (CTC)</Text>
          </div>
          {revisions.length > 1 ? (
            <Select
              value={revIdx}
              onChange={setRevIdx}
              options={revisionOptions}
              suffixIcon={<CalendarOutlined />}
              style={{ minWidth: 200 }}
            />
          ) : (
            <span style={{ fontSize: 12.5, padding: '3px 12px', borderRadius: 999, border: `1px solid ${s.fieldBorder}`, color: s.muted }}>
              <CalendarOutlined /> Currently in effect
            </span>
          )}
        </div>
        {(note || pick(rev, EFFECTIVE_PATHS)) && (
          <Text style={{ fontSize: 12.5, color: s.muted }}>
            {note && <>Note: {note}</>}
            {note && pick(rev, EFFECTIVE_PATHS) && ' · '}
            {pick(rev, EFFECTIVE_PATHS) && <>Effective from {fmtDate(pick(rev, EFFECTIVE_PATHS))}</>}
          </Text>
        )}
        <SalaryTable figures={figures} />
        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, letterSpacing: 0.8 }}>TOTAL CTC</Text>
          <Text style={{ fontSize: 22, fontWeight: 700, color: '#D85C9E' }}>
            {fmtMoney(figures.ctcYear) || '—'} <span style={{ fontSize: 14 }}>/ year</span>
          </Text>
        </div>
      </div>
    );
  }

  return (
    <PanelCard bodyStyle={{ padding: 18 }}>
      <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${s.border}` }}>
        <PanelTitle
          title="Salary Structure"
          subtitle={(
            <span>
              Viewing records for <b style={{ color: s.text }}>{staff.name}</b>
              {!isBlank(templateName) && (
                <span style={{ marginLeft: 8, padding: '1px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, color: BRAND, background: 'rgba(177,30,106,0.08)', border: '1px solid rgba(177,30,106,0.25)' }}>
                  <FileTextOutlined /> Template: {templateName}
                </span>
              )}
            </span>
          )}
          extra={<Segmented options={['Structure', 'Revision History']} value={view} onChange={setView} />}
        />
      </div>
      {body}
    </PanelCard>
  );
}
