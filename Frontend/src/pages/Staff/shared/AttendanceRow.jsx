// One attendance day: date block · status/shift · P/HD/A/F/OT/L/WO chips.
// `staff` (org-wide page) adds the employee name + department line.
import React from 'react';
import { Typography } from 'antd';
import { asText, fmtMoney, statusColor } from './hrUtils';
import { CODES, isLit, norm } from './attendanceUtils';
import { StatusTag, DotTag } from './StaffUi';
import useSurface from './useSurface';

const { Text } = Typography;

export default function AttendanceRow({ day, staff, onOpen }) {
  const s = useSurface();
  const st = norm(day.status);
  let title = staff
    ? (day.punchIn ? `${day.punchIn} - ${day.punchOut || '-'}` : asText(day.status) || 'No Record')
    : (day.punchIn || asText(day.status) || 'No Record');
  let desc = [day.holidayName, day.shiftName, day.shiftTime].filter(Boolean).join(' · ');
  if (st === 'no shift') {
    title = 'Shift Not Assigned';
    desc = 'No active shift assigned to staff member on this date.';
  } else if (/absent/.test(st) && !day.punchIn) {
    title = staff ? 'No Punch Record' : 'Uninformed Absence';
    if (!staff) desc = 'No punch recorded.';
  }
  const disabled = st === 'no shift' || !day.status;
  // Org-wide rows show arrival punctuality ("On Time" / "Late") once punched in.
  const tag = staff && day.punchIn && day.punctuality
    ? <DotTag color={/late/i.test(day.punctuality) ? '#ff4d4f' : '#52c41a'}>{day.punctuality}</DotTag>
    : day.status && <StatusTag status={day.status} />;

  return (
    <div className="staff-att-row" style={{ borderBottom: `1px solid ${s.border}`, background: /absent/.test(st) ? 'rgba(255,77,79,0.03)' : 'transparent' }}>
      <div style={{ width: 70, flexShrink: 0, textAlign: 'center', borderRight: `1px solid ${s.border}`, padding: '12px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: s.text }}>{day.date.date()}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: s.muted }}>{day.date.format('ddd').toUpperCase()}</div>
        <div style={{ fontSize: 10, color: s.muted }}>{day.date.format('MMM YYYY').toUpperCase()}</div>
      </div>

      <div style={{ flex: 1, minWidth: 200, padding: '12px 16px' }}>
        {staff}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: staff ? 2 : 0 }}>
          <Text strong style={{ fontSize: staff ? 13.5 : 14.5, color: s.text }}>{title}</Text>
          {tag}
        </div>
        <Text style={{ fontSize: 12.5, color: s.muted, display: 'block', marginTop: 2 }}>
          {desc}
          {!staff && day.punchOut && <> · Out {day.punchOut}</>}
          {day.fine > 0 && <span style={{ color: '#ff4d4f', fontWeight: 600 }}> · Fine: {fmtMoney(day.fine)}</span>}
        </Text>
        {day.note && <Text style={{ fontSize: 12, color: s.muted, display: 'block', fontStyle: 'italic' }}>Note: {day.note}</Text>}
      </div>

      <div className="staff-att-codes">
        {CODES.map((c) => {
          const lit = !disabled && isLit(c, day);
          const color = c.code === 'F' ? '#ff4d4f' : c.code === 'OT' ? '#13a8a8' : statusColor(c.label);
          const popup = onOpen && lit && (c.code === 'F' ? 'fine' : c.code === 'OT' ? 'overtime' : (c.code === 'L' || c.code === 'HD') ? 'leave' : null);
          return (
            <span
              key={c.code}
              onClick={popup ? () => onOpen(popup, day.key) : undefined}
              title={popup ? `View ${c.label.toLowerCase()} details` : c.label}
              style={{
                gridColumn: c.wide ? '1 / -1' : undefined,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '3px 8px', borderRadius: 6, fontSize: 10.5, letterSpacing: 0.4, whiteSpace: 'nowrap',
                border: `1px solid ${lit ? `${color}66` : s.fieldBorder}`,
                background: lit ? `${color}18` : s.card,
                color: lit ? color : s.muted,
                opacity: disabled ? 0.45 : 1,
                cursor: popup ? 'pointer' : 'default',
              }}
            >
              <b>{c.code}</b>{c.label.toUpperCase()}
            </span>
          );
        })}
      </div>
    </div>
  );
}
