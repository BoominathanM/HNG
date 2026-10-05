// Collapsible GPS points for one time window — loads
// GET /admin/hrms-geo/tracking/timeline/{staffId}/locations?from&to only when opened.
import React, { useState } from 'react';
import { Spin, Typography } from 'antd';
import { AimOutlined, DownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useGetGeoTimelineLocationsQuery } from '../../../store/api/apiSlice';
import { toList } from '../../Staff/shared/hrUtils';
import useSurface from '../../Staff/shared/useSurface';
import { latLng, fmtLatLng, mapsLink } from './geoUtils';

const { Text } = Typography;

export default function LocationRecords({ staffId, from, to, onSelect, selected }) {
  const s = useSurface();
  const [open, setOpen] = useState(false);
  const { data, isFetching, isError } = useGetGeoTimelineLocationsQuery({ staffId, from, to }, { skip: !open || !from || !to });
  const points = toList(data);
  const cell = { padding: '5px 8px', borderTop: `1px solid ${s.border}`, fontSize: 11.5, verticalAlign: 'top' };

  if (!from || !to) return null;
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${s.fieldBorder}`, background: s.field, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#B11E6A' }}
      >
        <span><AimOutlined /> {open && !isFetching && !isError ? `${points.length} location records` : 'Show location records'} {isFetching && <Spin size="small" />}</span>
        <DownOutlined style={{ fontSize: 11, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && isError && <Text style={{ display: 'block', padding: '6px 12px', fontSize: 12, color: '#ff4d4f' }}>Could not load the location records.</Text>}
      {open && !isFetching && !isError && !points.length && <Text style={{ display: 'block', padding: '6px 12px', fontSize: 12, color: s.muted }}>No location records in this period.</Text>}
      {open && points.length > 0 && (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ color: s.muted, textAlign: 'left', fontSize: 11 }}>
                {['#', 'Time', 'Latitude, Longitude', 'Movement', 'Accuracy', 'Battery', 'Address'].map((h) => <th key={h} style={{ padding: '5px 8px', fontWeight: 700 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {points.map((p, i) => {
                const pos = latLng(p);
                const on = selected && pos && selected[0] === pos[0] && selected[1] === pos[1];
                return (
                  <tr
                    key={`${p.t}-${i}`}
                    onClick={(e) => { e.stopPropagation(); if (pos) onSelect?.(pos); }}
                    style={{ cursor: 'pointer', background: on ? 'rgba(177,30,106,0.08)' : s.card }}
                  >
                    <td style={{ ...cell, color: s.muted }}>{i + 1}</td>
                    <td style={{ ...cell, fontWeight: 700, whiteSpace: 'nowrap' }}>{p.t ? dayjs(p.t).format('hh:mm:ss A') : '—'}</td>
                    <td style={{ ...cell, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {pos ? <a href={mapsLink(pos)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{fmtLatLng(pos)}</a> : '—'}
                    </td>
                    <td style={{ ...cell, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{p.movementType || '—'}{p.speed != null && <span style={{ color: s.muted }}> · {p.speed} m/s</span>}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{p.accuracy != null ? `${Math.round(p.accuracy)} m` : '—'}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>{p.battery != null ? `${p.battery}%` : '—'}</td>
                    <td style={{ ...cell, color: s.muted }}>{p.address || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
