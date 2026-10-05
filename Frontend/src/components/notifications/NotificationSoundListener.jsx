import { useEffect, useRef } from 'react';
import { useGetNotificationsQuery, useGetNotificationSoundConfigQuery } from '../../store/api/apiSlice';
import { GESTURE_EVENTS, showSoundBlockedHint, playOn, primeAudio, replayBlocked } from '../../utils/soundPlayback';

const POLL_MS = 30000;

// Mounted once in AppLayout, sibling to AlertListener (a different alert source —
// this one is the navbar bell's `Notification` model, not AlertConfig). Plays the
// admin-uploaded notification sound (Notifications > Alert Sound tab, backed by its
// own NotificationSoundConfig schema) whenever a genuinely new notification arrives
// for the logged-in user, not on every 30s poll tick.
export default function NotificationSoundListener() {
  // Same query args as Header.jsx's bell — RTK Query dedupes this into the same
  // cached subscription, so this adds no extra network traffic.
  const { data } = useGetNotificationsQuery({ limit: 10 }, { pollingInterval: POLL_MS });
  const { data: soundConfigData } = useGetNotificationSoundConfigQuery();

  const sound = soundConfigData?.data;
  const audioElRef = useRef(null);
  const unlockedRef = useRef(false);
  const lastSeenIdRef = useRef(undefined); // undefined = not yet initialized (skip first mount)
  // A notification sound the browser blocked (autoplay policy) — replayed on the user's next
  // click / key press instead of being lost.
  const blockedSrcRef = useRef(null);

  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    // Same handling as AlertListener — a blocked sound is replayed on the next gesture,
    // otherwise the first gesture just primes the element. See utils/soundPlayback.js for why
    // (and for the old unlock bug that cut off the first sound of every page session).
    const onGesture = () => {
      const el = audioElRef.current;
      const blocked = blockedSrcRef.current;
      if (blocked) {
        blockedSrcRef.current = null;
        unlockedRef.current = true;
        replayBlocked(el, blocked).then((ok) => {
          // Still refused (gesture didn't count, e.g. Esc) — keep it for the next one.
          if (!ok && !blockedSrcRef.current) blockedSrcRef.current = blocked;
        });
        return;
      }
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      if (el.paused) primeAudio(el); // never cut off a sound already playing
    };
    // Capture phase so it runs before the click's own handler.
    GESTURE_EVENTS.forEach((ev) => document.addEventListener(ev, onGesture, true));
    return () => GESTURE_EVENTS.forEach((ev) => document.removeEventListener(ev, onGesture, true));
  }, []);

  useEffect(() => {
    // Still loading (first render before the query ever resolves) — `data` is
    // `undefined` here, which is a DIFFERENT effect run from the one where the
    // query's first real response lands. Bailing out here (rather than treating
    // `undefined` as "seen") means the baseline gets recorded exactly once, on
    // the first REAL response — not twice (once for `undefined`, once for the
    // first real array), which previously left `lastSeenIdRef.current` sitting
    // at `null` a run early and made the first genuine response look "new",
    // ringing once for a pre-existing notification on every page load.
    if (!data) return;
    const notifications = data.data || [];
    const topId = notifications[0]?._id || null;

    if (lastSeenIdRef.current === undefined) {
      // First real load (including right after login) — just record where we
      // are, never ring for notifications that already existed before this mount.
      lastSeenIdRef.current = topId;
      return;
    }

    if (topId && topId !== lastSeenIdRef.current) {
      lastSeenIdRef.current = topId;
      if (sound?.isEnabled && sound?.audioUrl) {
        const src = sound.audioUrl;
        playOn(audioElRef.current, src).catch((err) => {
          if (err?.name === 'NotAllowedError') {
            // No click/key on this page since it loaded → the browser blocked the sound.
            // Keep it for the next gesture and tell the user why it was silent.
            blockedSrcRef.current = src;
            showSoundBlockedHint();
          } else if (err?.name !== 'AbortError') {
            console.warn('[NotificationSoundListener] notification sound failed to play:', err?.name, err?.message, src);
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
