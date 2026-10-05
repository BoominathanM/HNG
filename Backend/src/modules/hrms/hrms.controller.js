// Read-only proxy to the EktaHR HRMS API, used by the Staff Management and
// HRMS Geo pages.
//
// EktaHR's CORS only allows its own origin, so the HNG frontend can't call it
// from the browser — every request goes through here instead. The EktaHR admin
// Bearer token lives in Backend/.env (EKTAHR_API_TOKEN) and never reaches the
// client. GET only, restricted to the path prefixes the Staff pages use.
const asyncHandler = require('../../utils/asyncHandler');
const AppError = require('../../utils/AppError');

const DEFAULT_BASE_URL = 'https://uat.ektahr.com/api';
const ALLOWED_PREFIXES = ['admin/staff', 'admin/approvals', 'admin/settings', 'admin/hrms-geo'];
// Some EktaHR GEO endpoints (tasks, live tracking) take well over 20s on UAT.
const TIMEOUT_MS = 45000;

const baseUrl = () => (process.env.EKTAHR_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

// HRMS GEO paths are gated by the "HRMS Geo" module, everything else by
// "Staff Management" — same deny-by-default rule as the frontend's PermissionRoute.
const moduleFor = (subPath) => (subPath.startsWith('admin/hrms-geo') ? 'HRMS Geo' : 'Staff Management');
const canRead = (user, module) =>
  user.role === 'Super Admin' || user.role === 'Admin' || user.getPermission(module)?.read === true;

exports.proxyGet = asyncHandler(async (req, res, next) => {
  const module = moduleFor(String(req.params[0] || '').replace(/^\/+/, ''));
  if (!canRead(req.user, module)) return next(new AppError(`Access denied: read on ${module}`, 403));

  const token = process.env.EKTAHR_API_TOKEN;
  if (!token) return next(new AppError('EktaHR is not configured. Set EKTAHR_API_TOKEN in Backend/.env.', 503));

  const subPath = String(req.params[0] || '').replace(/^\/+|\/+$/g, '');
  const segments = subPath.split('/');
  const allowed = ALLOWED_PREFIXES.some((p) => subPath === p || subPath.startsWith(`${p}/`));
  if (!allowed || segments.some((s) => !s || s === '.' || s === '..')) {
    return next(new AppError('Unknown HR endpoint', 404));
  }

  const url = new URL(`${baseUrl()}/${segments.map(encodeURIComponent).join('/')}`);
  Object.entries(req.query).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((v) => {
      if (v != null && typeof v !== 'object') url.searchParams.append(key, String(v));
    });
  });

  let upstream;
  try {
    upstream = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'request timed out' : err.message;
    return next(new AppError(`Could not reach EktaHR: ${reason}`, 504));
  }

  const body = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    // A 401 here means the stored EktaHR token is invalid/expired — NOT the HNG
    // user's session. Surface it as 502 so the frontend's axios interceptor
    // doesn't try to refresh (and then log out) the HNG session.
    if (upstream.status === 401) {
      return next(new AppError('EktaHR session expired or invalid. Update EKTAHR_API_TOKEN in Backend/.env.', 502));
    }
    const status = upstream.status >= 500 ? 502 : upstream.status;
    return next(new AppError(body?.message || `EktaHR request failed (${upstream.status})`, status));
  }

  res.status(200).json(body ?? {});
});
