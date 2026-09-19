import { useEffect, useState } from 'react';

// Returns `value` after it has stopped changing for `delay` ms — used so server-side search boxes
// fire one request per pause in typing instead of one per keystroke.
export default function useDebouncedValue(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
