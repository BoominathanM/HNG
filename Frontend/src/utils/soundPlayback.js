import { enqueueSnackbar, closeSnackbar } from 'notistack';

// Shared by the two app-wide sound players — components/alerts/AlertListener.jsx (Alert
// Configuration rings) and components/notifications/NotificationSoundListener.jsx (navbar
// bell sound).
//
// Browsers block audible play() until the user has interacted with the page (a refresh resets
// that). Both listeners therefore keep a sound the browser blocked and replay it on the next
// user gesture — played inside the gesture handler, which is what the browser allows — and
// otherwise prime their audio element on the first gesture with SILENT_WAV (iOS/Safari only
// allow later programmatic play() on an element first played from a gesture).
//
// Never prime by playing the element muted with no src: that play() promise stays PENDING and
// resolves when the first real sound starts, so a "pause + unmute + restore src" in its .then
// cut off the first sound of every page session — the bug this replaced.

// Events the browser counts as a user activation (touchstart is not — touchend is; a touch
// pointerdown isn't either, so a refused attempt there is retried on that tap's touchend/click).
export const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'];

// 10ms of silence.
export const SILENT_WAV = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

// One shared key: when both listeners are blocked at once only one hint is shown
// (notistack's preventDuplicate compares by key when a key is given).
const SOUND_BLOCKED_KEY = 'sound-blocked-by-browser';

export const showSoundBlockedHint = () => enqueueSnackbar(
  '🔇 Sound was blocked by the browser — click anywhere on the page to hear it.',
  { key: SOUND_BLOCKED_KEY, variant: 'info', preventDuplicate: true, autoHideDuration: 15000 },
);

export const hideSoundBlockedHint = () => closeSnackbar(SOUND_BLOCKED_KEY);

// Play `src` on `el` from scratch, clearing handlers left by a previous sound.
export const playOn = (el, src) => {
  el.onended = null;
  el.onerror = null;
  el.muted = false;
  el.src = src;
  return el.play();
};

// First-gesture priming: play SILENT_WAV muted. Muted playback is always allowed and never
// takes the device's audio focus (an unmuted clip — even a silent one — pauses the user's
// music on iPhones); playOn() unmutes again for the real sound.
export const primeAudio = (el) => {
  el.onended = null;
  el.onerror = null;
  el.muted = true;
  el.src = SILENT_WAV;
  el.play().catch(() => {});
};

// Replay a sound the browser blocked, from inside a user gesture. Resolves true once it plays;
// false if the browser still refused it (e.g. the gesture was Esc, which doesn't count as an
// interaction) so the caller keeps it pending for the next gesture.
export const replayBlocked = (el, src) => playOn(el, src).then(
  () => { hideSoundBlockedHint(); return true; },
  (err) => {
    if (err?.name === 'NotAllowedError') return false;
    hideSoundBlockedHint(); // a different failure (bad file etc.) — retrying won't help
    return true;
  },
);
