import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { enqueueSnackbar, closeSnackbar } from 'notistack';
import { Dropdown } from 'antd';
import { useGetActiveAlertsQuery, useSnoozeAlertMutation, useStopAlertMutation } from '../../store/api/apiSlice';
import AssigneeTaskStatusModal from '../tasks/AssigneeTaskStatusModal';
import { GESTURE_EVENTS, showSoundBlockedHint, hideSoundBlockedHint, playOn, primeAudio, replayBlocked } from '../../utils/soundPlayback';

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

// Class on each toast's Snooze/Stop controls and on the Snooze menu (antd renders it in a
// portal, outside the toast). Those clicks silence the alert, so onGesture never treats one as
// the gesture that replays a blocked alert sound.
const SILENCE_CONTROL = 'alert-silence-control';

// Every open tab runs its own AlertListener and rings on its own, so Snooze/Stop in one tab
// tells this browser's other tabs to silence that alert too.
const SILENCE_CHANNEL = 'hng-alert-silence';

const alertSnackKey = (alertKey) => `alert-${alertKey}`;

// Mounted once in AppLayout so it's live on every authenticated page — the
// audio ring is app-wide, not scoped to the Operations/Settings page. Polls
// /api/alerts/active (server-computed, gated by each AlertConfig's own
// day/time-window + recipient list) and plays the configured audio clip
// whenever an alert's `firedAt` timestamp advances — i.e. once per cadence
// cycle, never on every poll tick.
export default function AlertListener() {
  const navigate = useNavigate();
  const currentUser = useSelector((s) => s.auth.user);
  const currentUserId = currentUser?._id || currentUser?.id;
  // Same admin-gate idiom used elsewhere (Settings > Snoozed Alerts, alerts.controller.js
  // isAdminOrManagement) — regular recipients only get Snooze/Stop/Close; View (which
  // navigates away to the underlying record) stays Admin/Super Admin/Management only.
  const isAdminOrManagement = !!currentUser && (
    currentUser.role === 'Super Admin' || currentUser.department === 'Admin' || currentUser.department === 'Management'
  );
  const { data } = useGetActiveAlertsQuery(undefined, { pollingInterval: POLL_MS });
  const [snoozeAlert] = useSnoozeAlertMutation();
  const [stopAlert] = useStopAlertMutation();
  // "Task to Assignee" alerts have no Stop — they only stop once the task is marked
  // Completed/Closed with remarks, so their toast opens this status modal instead.
  const [statusTarget, setStatusTarget] = useState(null); // { taskId, snackKey }

  const playedRef = useRef(new Map()); // alertKey -> firedAt already rung
  const audioElRef = useRef(null);
  const queueRef = useRef([]);
  const playingRef = useRef(false);
  const unlockedRef = useRef(false);
  // An alert whose sound the browser blocked (autoplay policy) — replayed on the user's next
  // click / key press instead of being lost until the alert's next repeat cycle.
  const blockedSoundRef = useRef(null);
  // The alert whose sound was last started on the audio element (plus playNext()'s done() while
  // the queue waits on it) — the sound that Snooze/Stop on that alert cuts off.
  const soundingRef = useRef(null);
  const silenceChannelRef = useRef(null);

  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    // Browsers block audio until the user has interacted with the page (a refresh resets it):
    // a blocked alert sound is replayed on the next gesture, otherwise the first gesture just
    // primes the element — see utils/soundPlayback.js for why (and for the old unlock bug that
    // cut off the first alert sound of every page session).
    const onGesture = (e) => {
      const el = audioElRef.current;
      const blocked = blockedSoundRef.current;
      // A click on Snooze/Stop must silence the alert, not start its blocked sound — it only
      // primes the element below; the blocked sound waits for a click anywhere else.
      if (blocked && !e.target?.closest?.(`.${SILENCE_CONTROL}`)) {
        blockedSoundRef.current = null;
        unlockedRef.current = true;
        if (playingRef.current) { hideSoundBlockedHint(); return; } // a newer alert is already sounding
        soundingRef.current = { alertKey: blocked.alertKey };
        replayBlocked(el, blocked.audioUrl).then((ok) => {
          // Still refused (gesture didn't count, e.g. Esc) — keep it for the next one,
          // unless another blocked alert has taken its place meanwhile.
          if (!ok && !blockedSoundRef.current) blockedSoundRef.current = blocked;
        });
        return;
      }
      if (unlockedRef.current || playingRef.current) return;
      unlockedRef.current = true;
      primeAudio(el);
    };
    // Capture phase so it runs before the click's own handler (e.g. a toast button closing it).
    GESTURE_EVENTS.forEach((ev) => document.addEventListener(ev, onGesture, true));
    return () => GESTURE_EVENTS.forEach((ev) => document.removeEventListener(ev, onGesture, true));
  }, []);

  // Snooze/Stop cut the ringing off at once. Without this the configured clip (e.g. a 30-second
  // song) played on to its end after the click, and a copy of the alert still in the queue rang
  // again after it.
  const silenceAlert = (alertKey) => {
    queueRef.current = queueRef.current.filter((a) => a.alertKey !== alertKey);
    if (blockedSoundRef.current?.alertKey === alertKey) {
      blockedSoundRef.current = null;
      hideSoundBlockedHint();
    }
    const sounding = soundingRef.current;
    if (sounding?.alertKey !== alertKey) return;
    soundingRef.current = null;
    const el = audioElRef.current;
    el.onended = null;
    el.onerror = null;
    el.pause();
    sounding.done?.(); // the queue moves on to the next alert
  };

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(SILENCE_CHANNEL);
    // Snoozed/stopped in another tab — silence it here too and drop its toast.
    channel.onmessage = ({ data: msg }) => {
      if (!msg?.alertKey || msg.userId !== currentUserId) return;
      silenceAlert(msg.alertKey);
      closeSnackbar(alertSnackKey(msg.alertKey));
    };
    silenceChannelRef.current = channel;
    return () => {
      channel.close();
      silenceChannelRef.current = null;
    };
  }, [currentUserId]);

  const playNext = () => {
    if (playingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;
    playingRef.current = true;

    const el = audioElRef.current;
    // onended/onerror AND the play() rejection can both report the same failure — only the
    // first may advance the queue, or a second call would start/skip the next sound.
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (soundingRef.current?.done === done) soundingRef.current = null;
      playingRef.current = false;
      playNext();
    };
    soundingRef.current = { alertKey: next.alertKey, done };
    const playing = playOn(el, next.audioUrl);
    el.onended = done; // assigned before any media event can be dispatched (those are async)
    el.onerror = done;
    playing.catch((err) => {
      if (err?.name === 'NotAllowedError') {
        // No click/key on this page since it loaded → the browser blocked the sound.
        // Keep it for the next gesture and tell the user why it was silent.
        blockedSoundRef.current = next;
        showSoundBlockedHint();
      } else if (err?.name !== 'AbortError') { // AbortError = Snooze/Stop paused it before it began
        console.warn('[AlertListener] alert sound failed to play:', err?.name, err?.message, next.audioUrl);
      }
      done();
    });

    const key = alertSnackKey(next.alertKey);
    const btnStyle = {
      background: 'transparent', border: '1px solid #fff', color: '#fff',
      borderRadius: 6, padding: '2px 10px', marginRight: 6, cursor: 'pointer', fontSize: 12,
    };

    // Silence first — here and in the user's other tabs — then record it on the server.
    const silence = () => {
      silenceAlert(next.alertKey);
      silenceChannelRef.current?.postMessage({ alertKey: next.alertKey, userId: currentUserId });
    };
    const handleSnooze = async (minutes) => {
      silence();
      try {
        await snoozeAlert({ alertKey: next.alertKey, minutes, title: next.title }).unwrap();
      } finally {
        closeSnackbar(key);
      }
    };
    const handleStop = async () => {
      silence();
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
            rootClassName={SILENCE_CONTROL}
            menu={{
              items: SNOOZE_PRESETS.map((p) => ({ key: String(p.minutes), label: p.label })),
              onClick: ({ key: k }) => handleSnooze(Number(k)),
            }}
          >
            <button type="button" className={SILENCE_CONTROL} style={btnStyle}>Snooze ▾</button>
          </Dropdown>
          {next.group === 'assignee_task' ? (
            <button
              type="button"
              onClick={() => setStatusTarget({ taskId: next.alertKey.split(':')[2], snackKey: key })}
              style={btnStyle}
            >
              Update Status
            </button>
          ) : (
            <button type="button" className={SILENCE_CONTROL} onClick={handleStop} style={btnStyle}>
              Stop
            </button>
          )}
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

  return (
    <AssigneeTaskStatusModal
      open={!!statusTarget}
      taskId={statusTarget?.taskId}
      onClose={() => setStatusTarget(null)}
      onUpdated={() => closeSnackbar(statusTarget?.snackKey)}
    />
  );
}
