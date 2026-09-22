const DUP_GRAY_MAX = 26;
const DUP_FALLBACK_MAX = 6;
const MAX_AI_CANDIDATES = 3;

const isHex = (v, len) => typeof v === 'string' && v.length === len && /^[0-9a-f]+$/.test(v);

// Fingerprints come from the client — accept only well-formed values, ignore anything else.
function sanitizeFingerprint(raw) {
  return {
    sha256: isHex(raw?.sha256, 64) ? raw.sha256 : '',
    phash: isHex(raw?.phash, 32) ? raw.phash : '',
  };
}

// `fingerprints` arrives as a JSON string (multipart field) holding an array aligned with the uploaded files.
function parseFingerprints(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

// records: [{ url, sha256, phash, kind, label }]. Closest first; exact matches sort ahead of near ones.
function findMatches(fp, records, kind) {
  const out = [];
  for (const record of records) {
    if (fp.sha256 && record.sha256 && fp.sha256 === record.sha256) {
      out.push({ record, match: 'exact', distance: 0 });
    } else if (fp.phash && record.phash && record.kind === kind) {
      const distance = hamming(fp.phash, record.phash);
      if (distance <= DUP_GRAY_MAX) out.push({ record, match: 'near', distance });
    }
  }
  return out.sort((a, b) => (a.match === b.match ? a.distance - b.distance : a.match === 'exact' ? -1 : 1));
}

// files: multer files ({ path, filename }); fingerprints: parsed array aligned with `files`;
// records: photos already saved on this dispatch; newLabel: how the new photo is described to the AI.
// judge(newPhoto, candidates) → Promise<[{ candidate (1-based), duplicate, confidence, reason }] | null>
async function screenNewPhotos({ files, fingerprints, records, kind, newLabel, judge }) {
  const accepted = []; // { file, fp }
  const rejected = []; // { file, via, match, distance, confidence, reason }
  let aiUnavailable = false;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    const fp = sanitizeFingerprint(fingerprints[i]);
    // Photos accepted earlier in this same request count too, so a batch can't duplicate itself.
    const pool = [
      ...records,
      ...accepted.map((a) => ({ url: a.file.path, sha256: a.fp.sha256, phash: a.fp.phash, kind, label: newLabel })),
    ];
    const matches = findMatches(fp, pool, kind);

    const exact = matches.find((m) => m.match === 'exact');
    if (exact) {
      rejected.push({ file, via: 'exact', match: exact.record, distance: 0 });
      continue;
    }

    const near = matches.filter((m) => m.match === 'near').slice(0, MAX_AI_CANDIDATES);
    if (near.length === 0) {
      accepted.push({ file, fp });
      continue;
    }

    let verdicts = null;
    try {
      verdicts = await judge({ url: file.path, label: newLabel }, near.map((n) => n.record));
    } catch (err) {
      console.warn('[dispatch-photos] AI duplicate check failed:', err.message);
    }

    if (verdicts) {
      const hitIdx = near.findIndex((n, idx) => verdicts.find((v) => v.candidate === idx + 1)?.duplicate);
      if (hitIdx >= 0) {
        const v = verdicts.find((x) => x.candidate === hitIdx + 1);
        rejected.push({ file, via: 'ai', match: near[hitIdx].record, distance: near[hitIdx].distance, confidence: v.confidence, reason: v.reason });
      } else {
        accepted.push({ file, fp });
      }
    } else {
      aiUnavailable = true;
      const tight = near.find((n) => n.distance <= DUP_FALLBACK_MAX);
      if (tight) rejected.push({ file, via: 'near', match: tight.record, distance: tight.distance });
      else accepted.push({ file, fp });
    }
  }

  return { accepted, rejected, aiUnavailable };
}

function rejectionMessage(r) {
  const where = r.match?.label || 'this dispatch';
  if (r.via === 'exact') return `This exact photo is already uploaded (${where}). Duplicate photos aren't allowed — it was not saved.`;
  if (r.via === 'ai') return `AI flagged this as a duplicate of a photo already uploaded (${where})${r.reason ? `: ${r.reason}` : ''}. It was not saved.`;
  return `This photo looks like a repeat of one already uploaded (${where}). It was not saved.`;
}

function publicRejection(r) {
  return {
    via: r.via,
    message: rejectionMessage(r),
    matchedUrl: r.match?.url || '',
    matchedLabel: r.match?.label || '',
    distance: r.distance,
    confidence: r.confidence,
    reason: r.reason || '',
  };
}

// AI deep-scan groups → per-photo flags. `photos` must be in oldest-first order: the oldest photo in a
// group is kept as the original and every later one is flagged as its duplicate. Group indexes are the
// 1-based positions into `photos` that the AI was shown.
function flagsFromGroups(photos, groups) {
  const flags = new Map(); // url → { dupOf, reason, verdict, confidence }
  for (const g of groups) {
    const members = [...g.photos].sort((a, b) => a - b).map((n) => photos[n - 1]).filter(Boolean);
    if (members.length < 2) continue;
    const [original, ...rest] = members;
    for (const dup of rest) {
      if (!flags.has(dup.url) && dup.url !== original.url) {
        flags.set(dup.url, { dupOf: original.url, reason: g.reason, verdict: g.verdict, confidence: g.confidence });
      }
    }
  }
  return flags;
}

module.exports = {
  DUP_GRAY_MAX,
  DUP_FALLBACK_MAX,
  MAX_AI_CANDIDATES,
  sanitizeFingerprint,
  parseFingerprints,
  hamming,
  findMatches,
  screenNewPhotos,
  rejectionMessage,
  publicRejection,
  flagsFromGroups,
};
