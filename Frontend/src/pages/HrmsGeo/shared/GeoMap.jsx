// OpenStreetMap (Leaflet) map for the HRMS Geo pages.
//   markers: [{ id, pos: [lat, lng], label, color, title, size }]
//   lines:   [{ id, points: [[lat, lng], …], color, dashed, weight }]
//   circles: [{ id, pos, radius (m), color }]
// The view fits everything on first data and whenever `fitKey` changes;
// `focus` ([lat, lng]) pans/zooms to one point.
import React, { useEffect, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { AimOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [22.9734, 78.6569]; // India
const NONE = [];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

const markerIcon = ({ label, color = '#1a1a2e', size = 30 }) => L.divIcon({
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;`
    + 'display:flex;align-items:center;justify-content:center;font:700 11px/1 Outfit,sans-serif;'
    + `border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${esc(label)}</div>`,
});

export default function GeoMap({
  markers = NONE, lines = NONE, circles = NONE, height = 340, fitKey, focus, onMarkerClick, fitLabel = 'Fit All', overlay,
}) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fittedRef = useRef(false);
  const clickRef = useRef(onMarkerClick);
  const [full, setFull] = useState(false);
  useEffect(() => { clickRef.current = onMarkerClick; });

  // Create the map once.
  useEffect(() => {
    const map = L.map(boxRef.current, { center: DEFAULT_CENTER, zoom: 5, zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  const bounds = () => {
    const pts = [
      ...markers.map((m) => m.pos),
      ...lines.flatMap((l) => l.points),
      ...circles.map((c) => c.pos),
    ].filter(Boolean);
    return pts.length ? L.latLngBounds(pts) : null;
  };

  const fit = () => {
    const map = mapRef.current;
    const b = bounds();
    if (!map || !b) return;
    if (b.getNorthEast().equals(b.getSouthWest())) map.setView(b.getCenter(), 16);
    else map.fitBounds(b, { padding: [36, 36], maxZoom: 17 });
  };

  // Redraw data layers.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    circles.forEach((c) => {
      if (c.pos) L.circle(c.pos, { radius: c.radius || 50, color: c.color || '#B11E6A', weight: 1.5, fillOpacity: 0.12 }).addTo(layer);
    });
    lines.forEach((l) => {
      if (l.points?.length > 1) {
        L.polyline(l.points, { color: l.color || '#1a1a2e', weight: l.weight || 3.5, opacity: 0.85, dashArray: l.dashed ? '6 6' : undefined }).addTo(layer);
      }
    });
    markers.forEach((m) => {
      if (!m.pos) return;
      const mk = L.marker(m.pos, { icon: markerIcon(m), zIndexOffset: m.z || 0 }).addTo(layer);
      if (m.title) mk.bindTooltip(esc(m.title), { direction: 'top', offset: [0, -14] });
      mk.on('click', () => clickRef.current?.(m.id));
    });
    if (!fittedRef.current && bounds()) {
      fit();
      fittedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, lines, circles]);

  // Explicit re-fit (selection changes, "Show Day Route", …).
  useEffect(() => {
    if (fitKey !== undefined) fit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    if (focus && mapRef.current) mapRef.current.setView(focus, Math.max(mapRef.current.getZoom(), 16));
  }, [focus?.[0], focus?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => { mapRef.current?.invalidateSize(); fit(); }, 60);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [full]);

  return (
    <div className={full ? 'geo-map geo-map-full' : 'geo-map'} style={{ height: full ? undefined : height }}>
      <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 10, left: 54, zIndex: 1000, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Button size="small" icon={<AimOutlined />} onClick={fit} style={{ background: '#1a1a2e', color: '#fff', border: 'none', fontWeight: 600 }}>{fitLabel}</Button>
        {overlay}
      </div>
      <Tooltip title={full ? 'Exit full screen' : 'Full screen'}>
        <Button
          size="small"
          icon={full ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
          onClick={() => setFull((f) => !f)}
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
        />
      </Tooltip>
    </div>
  );
}

// Small legend chip row for map overlays.
export function MapLegend({ items }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '4px 10px', borderRadius: 8, background: 'rgba(26,26,46,0.88)', color: '#fff', fontSize: 11, fontWeight: 600 }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: it.line ? 14 : 8, height: it.line ? 3 : 8, borderRadius: it.line ? 2 : '50%', background: it.color, border: it.line ? 'none' : '1px solid #fff' }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
