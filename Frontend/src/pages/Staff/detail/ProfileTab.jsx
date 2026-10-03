// Profile tab — read-only view of GET /admin/staff/{id}. The record holds
// branch / template ids; names come from GET /admin/staff/setup (template
// lists) and GET /admin/settings/attendance/branches. The shift template is
// the active assignment (GET /admin/settings/shift-roster/active/{id}).
import React, { useMemo } from 'react';
import { Avatar, Col, Divider, Row, Typography } from 'antd';
import {
  UserOutlined, SafetyOutlined, EnvironmentOutlined, HeartOutlined,
  ApartmentOutlined, BankOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useGetHrActiveShiftQuery, useGetHrStaffSetupQuery, useGetHrBranchesQuery } from '../../../store/api/apiSlice';
import {
  pick, asText, fmtDate, boolText, toList, toRecord, activeShiftOf, isObjectId, initials, STAFF_FIELDS, BRAND,
} from '../shared/hrUtils';
import { PanelCard, SectionCard, ReadField } from '../shared/StaffUi';
import useSurface from '../shared/useSurface';

const { Text, Title } = Typography;

// `paths` = candidate EktaHR field names, first non-empty wins.
const SECTIONS = [
  {
    key: 'personal', title: 'Personal Information', icon: <UserOutlined />,
    fields: [
      { label: 'Employee ID', paths: STAFF_FIELDS.employeeId },
      { label: 'First Name', paths: STAFF_FIELDS.firstName },
      { label: 'Last Name', paths: STAFF_FIELDS.lastName },
      { label: 'Date of Birth (DOB)', paths: ['dateOfBirth', 'dob', 'personalInfo.dateOfBirth'], type: 'date' },
      { label: 'Gender', paths: ['gender', 'personalInfo.gender'] },
      { label: 'Blood Group', paths: ['bloodGroup', 'personalInfo.bloodGroup'] },
      { label: "Father's Name", paths: ['fatherName', 'fathersName', 'personalInfo.fatherName'] },
      { label: 'Marital Status', paths: ['maritalStatus', 'personalInfo.maritalStatus'] },
    ],
  },
  {
    key: 'contact', title: 'Contact & Security', icon: <SafetyOutlined />,
    fields: [
      { label: 'Email ID', paths: STAFF_FIELDS.email },
      { label: 'Phone Number', paths: STAFF_FIELDS.phone },
      { label: 'Alternate Phone', paths: ['alternatePhone', 'alternatePhoneNumber', 'alternateMobile', 'secondaryPhone'] },
    ],
  },
  {
    key: 'address', title: 'Address Details', icon: <EnvironmentOutlined />,
    fields: [
      { label: 'Current Address', paths: ['currentAddress.address', 'currentAddress.addressLine', 'currentAddress.line1', 'currentAddress', 'address'], span: 24, multiline: true },
      { label: 'Country', paths: ['currentAddress.country', 'country'], span: 8 },
      { label: 'State', paths: ['currentAddress.state', 'state'], span: 8 },
      { label: 'Pincode', paths: ['currentAddress.pincode', 'currentAddress.pinCode', 'currentAddress.zipCode', 'pincode'], span: 8 },
      { divider: true },
      { label: 'Permanent Address', paths: ['permanentAddress.address', 'permanentAddress.addressLine', 'permanentAddress.line1', 'permanentAddress'], span: 24, multiline: true },
      { label: 'Country', paths: ['permanentAddress.country', 'permanentCountry'], span: 8 },
      { label: 'State', paths: ['permanentAddress.state', 'permanentState'], span: 8 },
      { label: 'Pincode', paths: ['permanentAddress.pincode', 'permanentAddress.pinCode', 'permanentAddress.zipCode', 'permanentPincode'], span: 8 },
    ],
  },
  {
    key: 'disability', title: 'Disability Information', icon: <HeartOutlined />,
    fields: [
      { label: 'Physically Challenged?', paths: ['physicallyChallenged', 'isPhysicallyChallenged', 'disability.physicallyChallenged', 'disabilityInfo.physicallyChallenged'], type: 'bool' },
      { label: 'Disability Details', paths: ['disabilityDetails', 'disability.details', 'disabilityInfo.details'], hideEmpty: true },
    ],
  },
  {
    key: 'role', title: 'Role & Organization Setup', icon: <ApartmentOutlined />,
    fields: [
      { label: 'Department', paths: STAFF_FIELDS.department },
      { label: 'Employment Type', paths: STAFF_FIELDS.employmentType },
      { label: 'Joining Date', paths: STAFF_FIELDS.joiningDate, type: 'date' },
      { label: 'Onboarding Date', paths: ['onboardingDate', 'dateOfOnboarding'], type: 'date' },
      { label: 'Designation', paths: STAFF_FIELDS.designation },
      { label: 'Job Role', paths: ['jobRole', 'jobTitle'] },
      { label: 'Reporting Manager', paths: ['reportingManager', 'reportingManagerId', 'reportingTo', 'manager'] },
      { label: 'Branch', paths: ['branch', 'branchId'] },
      { label: 'Work Mode', paths: ['workMode.mode', 'workMode', 'workLocationType'], span: 24 },
    ],
  },
  {
    key: 'bank', title: 'Bank & Statutory Details', icon: <BankOutlined />,
    fields: [
      { label: 'PAN Number', paths: ['panNumber', 'pan', 'bankDetails.panNumber', 'statutory.panNumber'] },
      { label: 'Aadhaar Number', paths: ['aadhaarNumber', 'aadharNumber', 'aadhaar', 'statutory.aadhaarNumber'] },
      { label: 'Bank Name', paths: ['bankDetails.bankName', 'bankName'] },
      { label: 'Account Holder Name', paths: ['bankDetails.accountHolderName', 'accountHolderName'] },
      { label: 'Account Number', paths: ['bankDetails.accountNumber', 'accountNumber'] },
      { label: 'IFSC Code', paths: ['bankDetails.ifscCode', 'bankDetails.ifsc', 'ifscCode', 'ifsc'] },
      { label: 'Branch Name', paths: ['branchName', 'bankDetails.branchName', 'bankBranchName', 'bankBranch'] },
      { label: 'UPI ID', paths: ['bankDetails.upiId', 'upiId'] },
      { label: 'UAN Number', paths: ['uanNumber', 'uan', 'statutory.uanNumber'] },
      { label: 'PF Number', paths: ['pfNumber', 'statutory.pfNumber'] },
      { label: 'PF Start Date', paths: ['pfStartDate', 'statutory.pfStartDate'], type: 'date' },
      { label: 'ESI Number', paths: ['esiNumber', 'statutory.esiNumber'] },
      { label: 'ESI Start Date', paths: ['esiStartDate', 'statutory.esiStartDate'], type: 'date' },
    ],
  },
  {
    key: 'policy', title: 'Policy & Template Configurations', icon: <SettingOutlined />,
    fields: [
      { label: 'Salary Template', paths: ['salaryTemplate', 'salaryTemplateId', 'templates.salaryTemplate'] },
      { label: 'Shift Template (This Month)', paths: ['shiftTemplate', 'shiftTemplateId', 'templates.shiftTemplate'], activeShift: true },
      { label: 'Leave Template', paths: ['leaveTemplate', 'leaveTemplateId', 'templates.leaveTemplate'] },
      { label: 'Holiday Template', paths: ['holidayTemplate', 'holidayTemplateId', 'templates.holidayTemplate'] },
      { label: 'Permission Template', paths: ['permissionTemplate', 'permissionTemplateId', 'templates.permissionTemplate'] },
      { label: 'Overtime Template', paths: ['overtimeTemplate', 'overtimeTemplateId', 'templates.overtimeTemplate'] },
      { label: 'Break Template', paths: ['breakTemplate', 'breakTemplateId', 'templates.breakTemplate'] },
      { label: 'Attendance Template', paths: ['attendanceTemplate', 'attendanceTemplateId', 'templates.attendanceTemplate'] },
      { label: 'Weekly Off Template', paths: ['weeklyOffTemplate', 'weekOffTemplate', 'weeklyOffTemplateId', 'templates.weeklyOffTemplate'] },
    ],
  },
];

// Ids resolve through `names` (id → name); an unresolved id shows as N/A
// rather than a raw Mongo id.
const valueOf = (record, field, names) => {
  const raw = pick(record, field.paths);
  if (field.type === 'date') return fmtDate(raw);
  if (field.type === 'bool') return boolText(raw);
  if (isObjectId(raw)) return names[raw];
  return asText(raw);
};

const SETUP_LISTS = [
  'salaryTemplates', 'shiftTemplates', 'attendanceTemplates', 'leaveTemplates', 'holidayTemplates',
  'weeklyOffTemplates', 'breakTemplates', 'overtimeTemplates', 'permissionTemplates',
];

export default function ProfileTab({ staffId, record, staff }) {
  const s = useSurface();
  const { data: shiftRes } = useGetHrActiveShiftQuery(staffId);
  const { data: setupRes } = useGetHrStaffSetupQuery();
  const { data: branchRes } = useGetHrBranchesQuery();
  const activeShiftName = activeShiftOf(shiftRes)?.name;

  const names = useMemo(() => {
    const map = {};
    const setup = toRecord(setupRes) || {};
    SETUP_LISTS.forEach((key) => (setup[key] || []).forEach((t) => { if (t?._id) map[t._id] = asText(t); }));
    toList(branchRes).forEach((b) => { if (b?._id) map[b._id] = asText(pick(b, ['branchName', 'name'])); });
    return map;
  }, [setupRes, branchRes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <PanelCard bodyStyle={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar
            size={72}
            src={staff.photo || undefined}
            style={{ background: 'rgba(177,30,106,0.10)', color: BRAND, fontWeight: 700, fontSize: 24, border: '3px solid rgba(177,30,106,0.15)', flexShrink: 0 }}
          >
            {initials(staff.name)}
          </Avatar>
          <div style={{ minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, color: s.text }}>{staff.name}</Title>
            <Text style={{ fontSize: 12.5, color: s.muted }}>Emp ID: {staff.employeeId || 'N/A'}</Text>
          </div>
        </div>
      </PanelCard>

      {SECTIONS.map((sec) => (
        <SectionCard key={sec.key} icon={sec.icon} title={sec.title}>
          <Row gutter={[20, 14]}>
            {sec.fields.map((f, i) => {
              if (f.divider) return <Col key={`d${i}`} span={24}><Divider style={{ margin: '2px 0' }} /></Col>;
              const value = (f.activeShift && activeShiftName) || valueOf(record, f, names);
              if (f.hideEmpty && !value) return null;
              return (
                <Col key={`${sec.key}-${i}`} xs={24} md={f.span || 12}>
                  <ReadField label={f.label} value={value} multiline={f.multiline} />
                </Col>
              );
            })}
          </Row>
        </SectionCard>
      ))}
    </div>
  );
}
