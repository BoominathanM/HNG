import { useEffect, useRef } from 'react';
import { useGetNotificationsQuery, useGetNotificationSoundConfigQuery } from '../../store/api/apiSlice';

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

  useEffect(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
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
        const el = audioElRef.current;
        el.src = sound.audioUrl;
        el.play().catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return null;
}
