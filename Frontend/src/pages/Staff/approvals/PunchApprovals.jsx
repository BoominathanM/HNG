// Punch approvals — "Attendance Pending for Approval" for one day, grouped by
// shift. GET /admin/approvals/punch?date=YYYY-MM-DD (flat rows: staffName,
// punchInTime/Location/Selfie, punchOut…, shiftName, isPendingApproval).
import React, { useMemo, useState } from 'react';
import { Button, DatePicker, Image, Input, Skeleton, Table, Typography } from 'antd';
import { CameraOutlined, EnvironmentOutlined, FieldTimeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageBreadcrumb from '../../../components/common/PageBreadcrumb';
import { useGetHrApprovalsQuery } from '../../../store/api/apiSlice';
import useDebouncedValue from '../../../hooks/useDebouncedValue';
import { pick, asText, fmtTime, toList, groupByShift, STAFF_FIELDS, staffName, BRAND } from '../shared/hrUtils';
import { PanelCard, PageHeaderCard, EmptyBlock, LoadError, StatusTag } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';

const { Text } = Typography;

const PUNCH = {
  in: {
    time: ['punchIn.time', 'punchIn.punchTime', 'punchInTime', 'checkInTime', 'punchIn', 'checkIn'],
    photo: ['punchIn.photo', 'punchIn.selfie', 'punchIn.image', 'punchInPhoto', 'punchInSelfie', 'checkInPhoto'],
    place: ['punchIn.address', 'punchIn.location.address', 'punchIn.location', 'punchInAddress', 'punchInLocation', 'checkInAddress'],
  },
  out: {
    time: ['punchOut.time', 'punchOut.punchTime', 'punchOutTime', 'checkOutTime', 'punchOut', 'checkOut'],
    photo: ['punchOut.photo', 'punchOut.selfie', 'punchOut.image', 'punchOutPhoto', 'punchOutSelfie', 'checkOutPhoto'],
    place: ['punchOut.address', 'punchOut.location.address', 'punchOut.location', 'punchOutAddress', 'punchOutLocation', 'checkOutAddress'],
  },
};

const staffOf = (r) => {
  const ref = pick(r, ['staffId', 'staff', 'employee', 'user']);
  return ref && typeof ref === 'object' ? ref : r;
};

function PunchCell({ record, side }) {
  const s = useSurface();
  const p = PUNCH[side];
  const time = fmtTime(pick(record, p.time));
  const photo = pick(record, p.photo);
  const photoUrl = typeof photo === 'string' ? photo : pick(photo, ['url', 'secure_url']);
  const place = asText(pick(record, p.place));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      {photoUrl ? (
        <Image src={photoUrl} width={30} height={30} style={{ borderRadius: 8, objectFit: 'cover' }} />
      ) : (
        <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: s.field, border: `1px solid ${s.fieldBorder}`, color: s.muted }}>
          <CameraOutlined />
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ color: s.text }}>{time || '—'}</Text>
        {place && (
          <Text style={{ display: 'block', fontSize: 11.5, color: s.muted, lineHeight: 1.4 }}>
            <EnvironmentOutlined style={{ marginRight: 4, color: BRAND }} />{place}
          </Text>
        )}
      </div>
    </div>
  );
}

const COLUMNS = [
  {
    title: 'Staff',
    key: 'staff',
    width: 260,
    render: (_, r) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div>
          <Text strong>{staffName(staffOf(r))}</Text>
          {asText(pick(staffOf(r), STAFF_FIELDS.employeeId)) && (
            <Text type="secondary" style={{ display: 'block', fontSize: 11, fontFamily: 'monospace' }}>{asText(pick(staffOf(r), STAFF_FIELDS.employeeId))}</Text>
          )}
        </div>
        <StatusTag status={r.isPendingApproval ? 'Pending' : pick(r, ['status', 'approvalStatus'])} />
      </div>
    ),
  },
  { title: 'Punch In', key: 'in', render: (_, r) => <PunchCell record={r} side="in" /> },
  { title: 'Punch Out', key: 'out', render: (_, r) => <PunchCell record={r} side="out" /> },
];

export default function PunchApprovals() {
  const s = useSurface();
  const [date, setDate] = useState(() => dayjs());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const day = date.format('YYYY-MM-DD');

  const { data, isFetching, error, refetch } = useGetHrApprovalsQuery({ type: 'punch', date: day });
  // The endpoint only filters by date — search is applied here.
  const rows = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return toList(data).filter((r) => !q || [staffName(staffOf(r)), asText(pick(staffOf(r), STAFF_FIELDS.employeeId))]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [data, debouncedSearch]);
  const groups = useMemo(() => groupByShift(rows), [rows]);

  let body;
  if (error) body = <LoadError error={error} onRetry={refetch} />;
  else if (isFetching) body = <PanelCard><Skeleton active paragraph={{ rows: 5 }} /></PanelCard>;
  else if (!groups.length) body = <PanelCard><EmptyBlock icon={<FieldTimeOutlined />} text="No punches pending approval for this date." /></PanelCard>;
  else {
    body = groups.map((g) => (
      <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ color: s.text }}>{g.name}</Text>
          {g.time && <Text style={{ fontSize: 12, color: s.muted }}>{g.time}</Text>}
          <span style={{ padding: '0 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'rgba(177,30,106,0.12)', color: BRAND }}>{g.rows.length}</span>
        </div>
        <PanelCard bodyStyle={{ padding: 0 }}>
          <div className="table-responsive">
            <Table className="staff-table" size="middle" rowKey={(r, i) => r._id || i} dataSource={g.rows} columns={COLUMNS} pagination={false} />
          </div>
        </PanelCard>
      </div>
    ));
  }

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb items={[{ label: 'Staff Management', path: '/staff' }, { label: 'Approvals' }, { label: 'Punch' }]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeaderCard
          title="Attendance Pending for Approval"
          extra={(
            <>
              <Input allowClear prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200, borderRadius: 999 }} />
              <DatePicker value={date} onChange={(v) => v && setDate(v)} allowClear={false} format="DD MMM YYYY" />
              <Button shape="round" onClick={() => setDate(dayjs())} disabled={date.isSame(dayjs(), 'day')}>Today</Button>
            </>
          )}
        />
        {body}
      </div>
    </div>
  );
}
