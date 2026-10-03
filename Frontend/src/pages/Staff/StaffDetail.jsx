// Staff detail — header + tab grid. Profile/header data is GET /admin/staff/{id};
// each tab lives in ./detail and fetches its own EktaHR data.
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, Button, Skeleton, Typography } from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, ClockCircleOutlined, FileTextOutlined, CalendarOutlined,
  KeyOutlined, ScheduleOutlined, FolderOpenOutlined, WalletOutlined, FileDoneOutlined,
} from '@ant-design/icons';
import PageBreadcrumb from '../../components/common/PageBreadcrumb';
import { useGetHrStaffQuery } from '../../store/api/apiSlice';
import { toRecord, normalizeStaff, initials, typeColor, BRAND, ACTIVE_GRADIENT } from './shared/hrUtils';
import { PanelCard, DotTag, LoadError } from './shared/StaffUi';
import useSurface from './shared/useSurface';
import ProfileTab from './detail/ProfileTab';
import AttendanceTab from './detail/AttendanceTab';
import SalaryOverviewTab from './detail/SalaryOverviewTab';
import SalaryStructureTab from './detail/SalaryStructureTab';
import LeavesTab from './detail/LeavesTab';
import PermissionsTab from './detail/PermissionsTab';
import ShiftsTab from './detail/ShiftsTab';
import DocumentsTab from './detail/DocumentsTab';
import ReimbursementTab from './detail/ReimbursementTab';
import PayslipRequestsTab from './detail/PayslipRequestsTab';

const { Title } = Typography;

const TABS = [
  { key: 'profile', label: 'Profile', icon: <UserOutlined />, Component: ProfileTab },
  { key: 'attendance', label: 'Attendances', icon: <ClockCircleOutlined />, Component: AttendanceTab },
  { key: 'salary-overview', label: 'Salary Overview', icon: <span style={{ fontWeight: 700 }}>₹</span>, Component: SalaryOverviewTab },
  { key: 'salary-structure', label: 'Salary Structure', icon: <FileTextOutlined />, Component: SalaryStructureTab },
  { key: 'leaves', label: 'Leaves', icon: <CalendarOutlined />, Component: LeavesTab },
  { key: 'permissions', label: 'Permissions', icon: <KeyOutlined />, Component: PermissionsTab },
  { key: 'shifts', label: 'Shifts', icon: <ScheduleOutlined />, Component: ShiftsTab },
  { key: 'documents', label: 'Documents', icon: <FolderOpenOutlined />, Component: DocumentsTab },
  { key: 'reimbursement', label: 'Reimbursement', icon: <WalletOutlined />, Component: ReimbursementTab },
  { key: 'payslips', label: 'Payslip Requests', icon: <FileDoneOutlined />, Component: PayslipRequestsTab },
];

const chipStyle = (s) => ({
  display: 'inline-flex', alignItems: 'center', padding: '1px 10px', borderRadius: 6,
  fontSize: 12, fontWeight: 600, background: s.field, border: `1px solid ${s.fieldBorder}`, color: s.text,
});

export default function StaffDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const s = useSurface();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const active = TABS.find((t) => t.key === tabParam) || TABS[0];

  const { data, isLoading, error, refetch } = useGetHrStaffQuery(id);
  const record = toRecord(data);
  const staff = record ? normalizeStaff(record) : null;

  const setTab = (key) => setSearchParams(key === 'profile' ? {} : { tab: key }, { replace: true });
  const back = () => navigate('/staff/list');

  return (
    <div className="page-container fade-in">
      <PageBreadcrumb
        items={[
          { label: 'Staff Management', path: '/staff/list' },
          { label: 'Staff List', path: '/staff/list' },
          { label: staff?.name || 'Staff' },
        ]}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PanelCard bodyStyle={{ padding: '14px 18px' }}>
          {isLoading ? <Skeleton avatar active paragraph={{ rows: 1 }} /> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <Button shape="circle" icon={<ArrowLeftOutlined />} onClick={back} />
              {staff ? (
                <>
                  <Avatar
                    size={54}
                    src={staff.photo || undefined}
                    style={{ background: 'rgba(177,30,106,0.12)', color: BRAND, fontWeight: 700, fontSize: 20, border: '2px solid rgba(177,30,106,0.2)', flexShrink: 0 }}
                  >
                    {initials(staff.name, 1)}
                  </Avatar>
                  <div style={{ minWidth: 0 }}>
                    <Title level={4} style={{ margin: 0 }}>{staff.name}</Title>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {staff.employeeId && (
                        <span style={{ ...chipStyle(s), background: ACTIVE_GRADIENT, color: '#fff', border: 'none', fontFamily: 'monospace', fontSize: 11 }}>
                          {staff.employeeId}
                        </span>
                      )}
                      {staff.employmentType && <span style={{ ...chipStyle(s), color: typeColor(staff.employmentType) }}>{staff.employmentType}</span>}
                      {staff.designation && <span style={chipStyle(s)}>{staff.designation}</span>}
                      <DotTag color={staff.active ? '#52c41a' : '#8c8c8c'}>{staff.active ? 'Active' : 'Deactive'}</DotTag>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1 }}><LoadError error={error} onRetry={refetch} /></div>
              )}
            </div>
          )}
        </PanelCard>

        {staff && (
          <>
            <PanelCard bodyStyle={{ padding: 8 }}>
              <div className="staff-detail-tabs" role="tablist">
                {TABS.map((t) => {
                  const on = t.key === active.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      className={`staff-detail-tab${on ? ' is-active' : ''}`}
                      onClick={() => setTab(t.key)}
                      style={{
                        background: on ? ACTIVE_GRADIENT : 'transparent',
                        color: on ? '#fff' : s.muted,
                        fontWeight: on ? 600 : 500,
                        boxShadow: on ? '0 4px 12px rgba(177,30,106,0.3)' : 'none',
                      }}
                    >
                      {t.icon}<span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </PanelCard>

            <active.Component staffId={id} record={record} staff={staff} />
          </>
        )}
      </div>
    </div>
  );
}
