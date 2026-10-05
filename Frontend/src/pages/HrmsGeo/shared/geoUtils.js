// Shared helpers for the HRMS Geo pages (EktaHR /admin/hrms-geo/* via the
// backend's /hrms proxy).
import dayjs from 'dayjs';

// Map marker colours — same meaning as EktaHR's map.
export const MARKER = {
  tracked: '#1a1a2e',   // last tracked location
  punchIn: '#2F6FE0',   // only the punch-in location is known
  selected: '#B11E6A',
  none: '#8E8E93',
  start: '#52c41a',
  end: '#ff4d4f',
};

// [lat, lng] from { lat, lng } / { latitude, longitude }; null when missing or 0,0.
export const latLng = (o) => {
  if (!o) return null;
  const lat = Number(o.lat ?? o.latitude);
  const lng = Number(o.lng ?? o.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return [lat, lng];
};

export const fmtLatLng = (p) => (p ? `${p[0].toFixed(6)}, ${p[1].toFixed(6)}` : undefined);

export const mapsLink = (p) => (p ? `https://www.google.com/maps?q=${p[0]},${p[1]}` : undefined);

export const geoInitials = (name) => String(name || '')
  .split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'S';

export const timeAgo = (at, now = Date.now()) => {
  if (!at) return undefined;
  const sec = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
};

export const clockTime = (at) => (at ? dayjs(at).format('HH:mm') : undefined);

export const kmText = (v) => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'string' && /km/i.test(v)) return v;
  const n = Number(v);
  return Number.isNaN(n) ? String(v) : `${Math.round(n * 10) / 10} km`;
};

// Live-tracking row: where its position comes from (EktaHR `locationSource`).
export const locationLabel = (e) => (e.locationSource === 'punch_in' ? 'Punch-in location'
  : e.locationSource === 'none' ? 'No location today' : 'Last tracked location');

export const markerColor = (e, selected) => {
  if (selected) return MARKER.selected;
  if (!latLng(e)) return MARKER.none;
  return e.locationSource === 'punch_in' ? MARKER.punchIn : MARKER.tracked;
};

// "05:09 PM" on a given YYYY-MM-DD → ISO (timeline location window).
export const isoAt = (date, time) => {
  const d = dayjs(`${date} ${time}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm']);
  return d.isValid() ? d.toISOString() : undefined;
};

export const durationText = (date, from, to) => {
  const a = dayjs(`${date} ${from}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm']);
  const b = dayjs(`${date} ${to}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm']);
  if (!a.isValid() || !b.isValid()) return undefined;
  const mins = Math.max(0, b.diff(a, 'minute'));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
};
