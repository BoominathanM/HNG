import { useSelector } from 'react-redux';
import { surface } from './hrUtils';

// Theme-aware surface colours for the Staff pages (light / dark).
export default function useSurface() {
  const isDark = useSelector((st) => st.theme.isDark);
  return { ...surface(isDark), isDark };
}
