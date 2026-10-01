import { FileImageOutlined, FilePdfOutlined } from '@ant-design/icons';
import { isImageUrl, urlExtension } from '../../utils/logoFile';

/**
 * Square hotel-logo tile: the logo itself for images, a file icon for PDF/other files, or
 * the plain placeholder icon when there's no logo. Clicking a real logo opens it in a new tab.
 */
export default function LogoThumb({ url, size = 80, radius = 16 }) {
  const iconSize = Math.round(size * 0.42);
  const tile = (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: '#B11E6A12',
        border: '1px solid #B11E6A30',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {url && isImageUrl(url) ? (
        <img src={url} alt="Hotel logo" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }} />
      ) : url && urlExtension(url) === 'pdf' ? (
        <FilePdfOutlined style={{ fontSize: iconSize, color: '#B11E6A' }} />
      ) : (
        <FileImageOutlined style={{ fontSize: iconSize, color: '#B11E6A' }} />
      )}
    </div>
  );
  if (!url) return tile;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="Open logo in new tab" style={{ display: 'inline-block' }}>
      {tile}
    </a>
  );
}
