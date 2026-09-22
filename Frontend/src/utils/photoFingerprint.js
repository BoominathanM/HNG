// Fingerprints for Dispatch box photos — used to catch the same photo being uploaded twice.
//
// Two complementary fingerprints are computed in the browser (no extra dependencies):
//   • sha256 — hash of the file's exact bytes. Identical file (even under a different name) → identical hash.
//   • phash  — 128-bit "difference hash" of the picture's content (9x9 grayscale gradients). The same
//              photo re-saved, resized, re-compressed, screenshotted or brightness-adjusted lands within a
//              few bits of the original, while unrelated photographs land ~half the bits apart.
// Both are sent along with the upload and stored per saved photo (DispatchRecord.photoFingerprints). The
// backend does the authoritative matching — a byte-identical file is rejected outright, a near-match is
// handed to the AI to judge (see Backend/src/services/photoDuplicateService.js). The browser only uses the
// exact-file hash to reject an obvious re-upload instantly, before anything is sent.

const HASH_GRID = 9; // 9x9 samples → 8 rows x 8 horizontal + 8 cols x 8 vertical comparisons = 128 bits

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function loadDrawable(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return { source: await createImageBitmap(file), close: (s) => s.close?.() };
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Could not decode image'));
      img.src = url;
    });
    return { source: img, close: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// dHash on a 9x9 grayscale thumbnail. Down-scaled in two steps (via 64x64) so the browser averages
// the pixels instead of point-sampling a multi-megapixel photo, which would make the bits noisy.
async function computePhash(file) {
  const { source, close } = await loadDrawable(file);
  try {
    const step = document.createElement('canvas');
    step.width = 64; step.height = 64;
    const sctx = step.getContext('2d', { willReadFrequently: true });
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(source, 0, 0, 64, 64);

    const small = document.createElement('canvas');
    small.width = HASH_GRID; small.height = HASH_GRID;
    const ctx = small.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(step, 0, 0, HASH_GRID, HASH_GRID);
    const { data } = ctx.getImageData(0, 0, HASH_GRID, HASH_GRID);

    const gray = [];
    for (let i = 0; i < HASH_GRID * HASH_GRID; i += 1) {
      const o = i * 4;
      gray.push(data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114);
    }
    const at = (x, y) => gray[y * HASH_GRID + x];

    const bits = [];
    for (let y = 0; y < HASH_GRID - 1; y += 1) {
      for (let x = 0; x < HASH_GRID - 1; x += 1) bits.push(at(x, y) > at(x + 1, y) ? 1 : 0); // horizontal gradient
    }
    for (let y = 0; y < HASH_GRID - 1; y += 1) {
      for (let x = 0; x < HASH_GRID - 1; x += 1) bits.push(at(x, y) > at(x, y + 1) ? 1 : 0); // vertical gradient
    }
    const bytes = new Uint8Array(bits.length / 8);
    bits.forEach((bit, i) => { if (bit) bytes[i >> 3] |= 1 << (7 - (i & 7)); });
    return toHex(bytes);
  } finally {
    close(source);
  }
}

async function computeSha256(file) {
  if (!globalThis.crypto?.subtle) return ''; // insecure (plain-http) context — SubtleCrypto is unavailable
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return toHex(new Uint8Array(digest));
}

// Never throws — a photo that can't be fingerprinted (unsupported format, blocked canvas, …) simply
// uploads without one, exactly as before this check existed.
export async function fingerprintFile(file) {
  const [sha256, phash] = await Promise.all([
    computeSha256(file).catch(() => ''),
    computePhash(file).catch(() => ''),
  ]);
  return { sha256, phash };
}
