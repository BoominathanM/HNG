import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { enqueueSnackbar, closeSnackbar } from 'notistack';
import { Dropdown } from 'antd';
import { useGetActiveAlertsQuery, useSnoozeAlertMutation, useStopAlertMutation } from '../../store/api/apiSlice';

const POLL_MS = 20000;

// Presets for the Snooze duration picker — 1 min through 24 hr, per minutes.
const SNOOZE_PRESETS = [
  { label: '1 min', minutes: 1 },
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hr', minutes: 120 },
  { label: '4 hr', minutes: 240 },
  { label: '8 hr', minutes: 480 },
  { label: '12 hr', minutes: 720 },
  { label: '24 hr', minutes: 1440 },
];

// Mounted once in AppLayout so it's live on every authenticated page — the
// audio ring is app-wide, not scoped to the Operations/Settings page. Polls
// /api/alerts/active (server-computed, gated by each AlertConfig's own
// day/time-window + recipient list) and plays the configured audio clip
// whenever an alert's `firedAt` timestamp advances — i.e. once per cadence
// cycle, never on every poll tick.
export default function AlertListener() {
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth.user);
  // Same admin-gate idiom used elsewhere (Settings > Snoozed Alerts, alerts.controller.js
  // isAdminOrManagement) — regular recipients only get Snooze/Stop/Close; View (which
  // navigates away to the underlying record) stays Admin/Super Admin/Management only.
  const isAdminOrManagement = !!currentUser && (
    currentUser.role === 'Super Admin' || currentUser.department === 'Admin' || currentUser.department === 'Management'
  );
  const { data } = useGetActiveAlertsQuery(undefined, { pollingInterval: POLL_MS });
  const [snoozeAlert] = useSnoozeAlertMutation();
  const [stopAlert] = useStopAlertMutation();

  const playedRef = useRef(new Map()); // alertKey -> firedAt already rung
  const audioElRef = useRef(null);
  const queueRef = useRef([]);
  const playingRef = useRef(false);
  const unlockedRef = useRef(false);

  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    // Browsers block audio before a user gesture — unlock the element on the
    // session's first click so later programmatic play() calls aren't blocked.
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const el = audioElRef.current;
      const prevSrc = el.src;
      el.muted = true;
      el.play().then(() => {
        el.pause();
        el.muted = false;
        el.src = prevSrc || '';
      }).catch(() => { el.muted = false; });
    };
    document.addEventListener('click', unlock, { once: true });
    return () => document.removeEventListener('click', unlock);
  }, []);

  const playNext = () => {
    if (playingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    playingRef.current = true;

    const el = audioElRef.current;
    el.src = next.audioUrl;
    el.onended = () => { playingRef.current = false; playNext(); };
    el.onerror = () => { playingRef.current = false; playNext(); };
    el.play().catch(() => { playingRef.current = false; playNext(); });

    const key = `alert-${next.alertKey}`;
    const btnStyle = {
      background: 'transparent', border: '1px solid #fff', color: '#fff',
      borderRadius: 6, padding: '2px 10px', marginRight: 6, cursor: 'pointer', fontSize: 12,
    };

    const handleSnooze = async (minutes) => {
      try {
        await snoozeAlert({ alertKey: next.alertKey, minutes, title: next.title }).unwrap();
      } finally {
        closeSnackbar(key);
      }
    };
    const handleStop = async () => {
      try {
        await stopAlert({ alertKey: next.alertKey, title: next.title }).unwrap();
      } finally {
        closeSnackbar(key);
      }
    };

    enqueueSnackbar(next.title, {
      key,
      variant: 'warning',
      persist: true,
      action: () => (
        <>
          {isAdminOrManagement && (
            <button type="button" onClick={() => { navigate(next.link); closeSnackbar(key); }} style={btnStyle}>
              View
            </button>
          )}
          <Dropdown
            trigger={['click']}
            menu={{
              items: SNOOZE_PRESETS.map((p) => ({ key: String(p.minutes), label: p.label })),
              onClick: ({ key: k }) => handleSnooze(Number(k)),
            }}
          >
            <button type="button" style={btnStyle}>Snooze ▾</button>
          </Dropdown>
          <button type="button" onClick={handleStop} style={btnStyle}>
            Stop
          </button>
          <button
            type="button"
            onClick={() => closeSnackbar(key)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >
            ×
          </button>
        </>
      ),
    });
  };

  useEffect(() => {
    const alerts = data?.data || [];
    for (const alert of alerts) {
      if (!alert.audioUrl) continue;
      const lastPlayed = playedRef.current.get(alert.alertKey);
      if (lastPlayed === alert.firedAt) continue; // already rung for this cadence cycle
      playedRef.current.set(alert.alertKey, alert.firedAt);
      queueRef.current.push(alert);
    }
    playNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
