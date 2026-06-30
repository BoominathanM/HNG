/**
 * Reliable cross-origin file view / download for Cloudinary and other URLs.
 *
 * View:  just opens the raw URL in a new tab (browser handles inline display or download).
 * Save:  fetch → blob → object-URL so the browser saves with the real filename.
 *        Falls back to Cloudinary fl_attachment if fetch is blocked by CORS/network.
 */

const CLOUDINARY_RE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video|raw)\/upload\/)/;

const toSafeFilename = (name) =>
  (name || 'file').replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/^_+|_+$/g, '');

/** Open a file for viewing (inline or download — browser decides). */
export const viewFile = (url) => {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** Force-save a file with the given filename. */
export const downloadFile = async (url, filename) => {
  if (!url) return;

  const name = toSafeFilename(filename || 'invoice');

  // ── Strategy 1: fetch → blob (sets real filename; works when CORS is open) ─
  try {
    const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    return;
  } catch (_) {
    // CORS blocked or network error — fall through to Cloudinary strategy
  }

  // ── Strategy 2: Cloudinary fl_attachment flag (forces Content-Disposition:attachment) ─
  const cloudMatch = url.match(CLOUDINARY_RE);
  if (cloudMatch) {
    const flag = `fl_attachment:${name}`;
    const dlUrl = url.replace(cloudMatch[1], `${cloudMatch[1]}${flag}/`);
    // Open in a hidden frame so the tab doesn't flicker
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-1000px;left:-1000px;width:0;height:0;visibility:hidden;border:none;';
    iframe.src = dlUrl;
    document.body.appendChild(iframe);
    setTimeout(() => document.body.removeChild(iframe), 10000);
    return;
  }

  // ── Strategy 3: Final fallback ────────────────────────────────────────────
  window.open(url, '_blank', 'noopener,noreferrer');
};
