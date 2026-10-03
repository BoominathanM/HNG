// Presentational building blocks shared by the Staff Management pages.
import React, { useState } from 'react';
import { Alert, Button, Card, Descriptions, Popover, Typography } from 'antd';
import { FilterOutlined, LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  BRAND, BRAND_GRADIENT, isBlank, asText, humanize, fmtDate, errText, statusColor,
} from './hrUtils';
import useSurface from './useSurface';

const { Text } = Typography;

export function PanelCard({ children, style, bodyStyle }) {
  const s = useSurface();
  return (
    <Card
      style={{ borderRadius: 14, border: `1px solid ${s.border}`, background: s.card, boxShadow: s.shadow, ...style }}
      styles={{ body: { padding: 16, ...bodyStyle } }}
    >
      {children}
    </Card>
  );
}

// Brand square holding a section icon (`soft` = tinted instead of filled).
export function IconBadge({ icon, size = 30, soft = false }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.5),
      background: soft ? 'rgba(177,30,106,0.10)' : BRAND_GRADIENT,
      color: soft ? BRAND : '#fff',
    }}>
      {icon}
    </span>
  );
}

export function PanelTitle({ icon, title, subtitle, extra }) {
  const s = useSurface();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon && <IconBadge icon={icon} soft />}
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ fontSize: 15, color: s.text, display: 'block' }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: 12, color: s.muted }}>{subtitle}</Text>}
        </div>
      </div>
      {extra && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{extra}</div>}
    </div>
  );
}

// Card with a tinted header strip — the Profile tab's section layout.
export function SectionCard({ icon, title, extra, children }) {
  const s = useSurface();
  return (
    <Card
      style={{ borderRadius: 14, border: `1px solid ${s.border}`, background: s.card, boxShadow: s.shadow, overflow: 'hidden' }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '12px 18px', background: s.head, borderBottom: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconBadge icon={icon} size={26} />
          <Text strong style={{ fontSize: 14, color: s.text }}>{title}</Text>
        </div>
        {extra}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </Card>
  );
}

export function ReadField({ label, value, multiline = false }) {
  const s = useSurface();
  const empty = isBlank(value);
  return (
    <div>
      <Text strong style={{ fontSize: 12.5, color: s.text, display: 'block', marginBottom: 6 }}>{label}</Text>
      <div style={{
        background: s.field, border: `1px solid ${s.fieldBorder}`, borderRadius: 8,
        padding: '8px 12px', minHeight: multiline ? 72 : 40, fontSize: 14,
        color: empty ? s.muted : s.text, whiteSpace: multiline ? 'pre-wrap' : 'normal', wordBreak: 'break-word',
      }}>
        {empty ? 'N/A' : value}
      </div>
    </div>
  );
}

export function EmptyBlock({ icon, title, text, compact = false }) {
  const s = useSurface();
  return (
    <div style={{ textAlign: 'center', padding: compact ? '28px 16px' : '48px 16px' }}>
      {icon && (
        <div style={{ display: 'inline-flex', marginBottom: 12 }}>
          <IconBadge icon={icon} size={48} soft />
        </div>
      )}
      {title && <Text strong style={{ display: 'block', color: s.text, fontSize: 15, marginBottom: 4 }}>{title}</Text>}
      <Text style={{ display: 'block', color: s.muted, fontSize: 13.5 }}>{text}</Text>
    </div>
  );
}

// Page title card — the first card on every Staff sub-module page.
export function PageHeaderCard({ icon, title, subtitle, extra }) {
  const s = useSurface();
  return (
    <PanelCard bodyStyle={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {icon && <IconBadge icon={icon} size={38} soft />}
          <div style={{ minWidth: 0 }}>
            <Text strong style={{ fontSize: 19, color: s.text, display: 'block', lineHeight: 1.3 }}>{title}</Text>
            {subtitle && <Text style={{ fontSize: 12.5, color: s.muted }}>{subtitle}</Text>}
          </div>
        </div>
        {extra && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{extra}</div>}
      </div>
    </PanelCard>
  );
}

// "TOTAL REQUESTS / 0 / hint" card with an icon square on the right.
export function MetricCard({ label, value, hint, icon, color }) {
  const s = useSurface();
  const tone = color || s.text;
  return (
    <PanelCard style={{ height: '100%' }} bodyStyle={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <Text style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8, color: s.muted, display: 'block' }}>{label.toUpperCase()}</Text>
          <Text style={{ fontSize: 24, fontWeight: 700, color: tone, display: 'block', lineHeight: 1.3 }}>{value}</Text>
          {hint && <Text style={{ fontSize: 12, color: s.muted }}>{hint}</Text>}
        </div>
        {icon && (
          <span style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: color || BRAND, background: `${color || BRAND}14`, border: `1px solid ${color || BRAND}30`,
          }}>
            {icon}
          </span>
        )}
      </div>
    </PanelCard>
  );
}

// Bordered "icon · label · count" pill (Attendance statistics).
export function StatPill({ icon, label, value, color }) {
  const s = useSurface();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 10,
      border: `1px solid ${color ? `${color}55` : s.fieldBorder}`, background: color ? `${color}10` : s.card,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: s.text, minWidth: 0 }}>
        <span style={{ color: color || '#d48806' }}>{icon}</span>{label}
      </span>
      <span style={{ fontSize: 18, fontWeight: 700, color: color || s.text }}>{value}</span>
    </div>
  );
}

// Rounded segmented filter with counts ("All 17 | Pending 4 | …").
export function PillTabs({ items, value, onChange }) {
  const s = useSurface();
  return (
    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 2, padding: 4, borderRadius: 999, border: `1px solid ${s.fieldBorder}`, background: s.card, maxWidth: '100%' }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            style={{
              border: 'none', borderRadius: 999, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
              fontWeight: on ? 600 : 500, background: on ? BRAND_GRADIENT : 'transparent', color: on ? '#fff' : s.muted,
            }}
          >
            {it.label}
            {it.count > 0 && (
              <span style={{ marginLeft: 6, padding: '0 6px', borderRadius: 999, fontSize: 10.5, background: on ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)' }}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Staff name (+ Employee ID underneath, optional initial avatar).
export function StaffCell({ name, employeeId, avatar = false, onClick }) {
  const s = useSurface();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {avatar && (
        <span style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600, color: BRAND, background: 'rgba(177,30,106,0.10)', border: '1px solid rgba(177,30,106,0.2)',
        }}>
          {String(name || 'S')[0].toUpperCase()}
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        {onClick
          ? <a onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ fontWeight: 600, color: s.text }}>{name || '—'}</a>
          : <Text strong style={{ color: s.text }}>{name || '—'}</Text>}
        {employeeId && <Text style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: s.muted }}>{employeeId}</Text>}
      </div>
    </div>
  );
}

// Small uppercase pill with a leading dot ("• ACTIVE", "• FULL TIME").
export function DotTag({ color = BRAND, children }) {
  if (isBlank(children)) return <Text type="secondary">—</Text>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '1px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap',
      color, background: `${color}14`, border: `1px solid ${color}40`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {children}
    </span>
  );
}

export const StatusTag = ({ status }) => <DotTag color={statusColor(status)}>{asText(status)}</DotTag>;

export function LoadError({ error, onRetry }) {
  return (
    <Alert
      type="error"
      showIcon
      message={errText(error)}
      action={onRetry && <Button size="small" onClick={onRetry}>Retry</Button>}
      style={{ borderRadius: 10 }}
    />
  );
}

export function FiltersButton({ count = 0, onClear, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={(
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button size="small" type="link" disabled={!count} onClick={onClear} style={{ padding: 0 }}>Clear all</Button>
            <Button size="small" type="primary" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </div>
      )}
    >
      <Button shape="round" icon={<FilterOutlined />}>
        Filters{count ? ` (${count})` : ''}
      </Button>
    </Popover>
  );
}

export function FilterField({ label, children }) {
  return (
    <div>
      <Text style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</Text>
      {children}
    </div>
  );
}

// ── Month calendar ────────────────────────────────────────────────────────
export function CalendarHeader({ month, onChange, title, subtitle, showToday = true }) {
  const s = useSurface();
  return (
    <PanelCard bodyStyle={{ padding: '12px 16px' }}>
      <PanelTitle
        icon={<CalendarOutlined />}
        title={title}
        subtitle={subtitle}
        extra={(
          <>
            {showToday && <Button shape="round" size="small" onClick={() => onChange(dayjs().startOf('month'))}>Today</Button>}
            <Button shape="circle" size="small" icon={<LeftOutlined />} onClick={() => onChange(month.subtract(1, 'month'))} />
            <Text strong style={{ minWidth: 112, textAlign: 'center', color: s.text }}>{month.format('MMMM YYYY')}</Text>
            <Button shape="circle" size="small" icon={<RightOutlined />} onClick={() => onChange(month.add(1, 'month'))} />
          </>
        )}
      />
    </PanelCard>
  );
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function CalendarGrid({ month, renderCell, renderBadge, selectedDate, onSelect, minCellHeight = 92 }) {
  const s = useSurface();
  const start = month.startOf('month');
  const cells = [
    ...Array(start.day()).fill(null),
    ...Array.from({ length: month.daysInMonth() }, (_, i) => start.date(i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const today = dayjs();

  return (
    <PanelCard bodyStyle={{ padding: 12 }}>
      <div className="staff-cal-scroll">
        <div className="staff-cal-grid">
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: s.muted, padding: '6px 0' }}>{d}</div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={`b${i}`} style={{ minHeight: minCellHeight, borderRadius: 8, background: s.blank }} />;
            const isToday = date.isSame(today, 'day');
            const isSelected = selectedDate && date.isSame(selectedDate, 'day');
            return (
              <div
                key={date.format('YYYY-MM-DD')}
                onClick={onSelect ? () => onSelect(date) : undefined}
                style={{
                  minHeight: minCellHeight, borderRadius: 8, padding: 6, overflow: 'hidden',
                  border: `1px solid ${isSelected || isToday ? BRAND : s.fieldBorder}`,
                  background: isToday || isSelected ? 'rgba(177,30,106,0.05)' : s.card,
                  cursor: onSelect ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 600, width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: isToday ? BRAND_GRADIENT : 'transparent', color: isToday ? '#fff' : s.text,
                  }}>
                    {date.date()}
                  </span>
                  {renderBadge?.(date)}
                </div>
                {renderCell?.(date)}
              </div>
            );
          })}
        </div>
      </div>
    </PanelCard>
  );
}

// ── Generic record view ───────────────────────────────────────────────────
// Used for popups whose payload shape varies (fine / overtime / balances):
// shows every scalar field with a readable label, skipping technical keys.
const SKIP_KEY = /^_|^__v$|^id$|Id$|^(createdBy|updatedBy|adminId|companyId|organizationId|password)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;

const formatAny = (v) => {
  if (typeof v === 'string' && ISO_DATE.test(v)) return fmtDate(v, v.includes('T') ? 'MMM D, YYYY hh:mm A' : 'MMM D, YYYY');
  return asText(v);
};

export function ObjectDetails({ data, emptyText = 'No details available.' }) {
  const items = Object.entries(data && typeof data === 'object' ? data : {})
    .filter(([k, v]) => !SKIP_KEY.test(k) && !isBlank(formatAny(v)))
    .map(([k, v]) => ({ key: k, label: humanize(k), children: formatAny(v) }));
  if (!items.length) return <EmptyBlock text={emptyText} compact />;
  return <Descriptions bordered size="small" column={1} items={items} />;
}
