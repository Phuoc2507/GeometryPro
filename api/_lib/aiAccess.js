import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { checkAndConsume, creditsConfigured } from './credits.js';

const GUEST_COOKIE = 'geometrypro_guest';
const DAY_MS = 24 * 60 * 60 * 1000;

let cachedAdmin = null;
let cachedAdminKey = '';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const cacheKey = `${url}:${key}`;
  if (!cachedAdmin || cachedAdminKey !== cacheKey) {
    cachedAdmin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    cachedAdminKey = cacheKey;
  }
  return cachedAdmin;
}

function parseCookies(header = '') {
  const out = new Map();
  for (const part of String(header).split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    out.set(part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim()));
  }
  return out;
}

function signGuestId(id, secret) {
  return crypto.createHmac('sha256', secret).update(id).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readOrCreateGuestId(req, res, secret) {
  const value = parseCookies(req.headers?.cookie).get(GUEST_COOKIE);
  if (value) {
    const separator = value.lastIndexOf('.');
    if (separator > 0) {
      const id = value.slice(0, separator);
      const signature = value.slice(separator + 1);
      if (/^[0-9a-f-]{36}$/i.test(id) && safeEqual(signature, signGuestId(id, secret))) {
        return id;
      }
    }
  }

  const id = crypto.randomUUID();
  const signed = `${id}.${signGuestId(id, secret)}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${GUEST_COOKIE}=${encodeURIComponent(signed)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax${secure}`,
  );
  return id;
}

function requestIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  const realIp = req.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  return req.socket?.remoteAddress || 'local';
}

function subjectHash(secret, kind, value) {
  return crypto.createHmac('sha256', secret).update(`${kind}:${value}`).digest('hex');
}

function resetAt(windowStart, periodDays) {
  const started = windowStart ? new Date(windowStart).getTime() : Date.now();
  return new Date(started + periodDays * DAY_MS).toISOString();
}

export function setQuotaHeaders(res, quota) {
  if (!quota || res.headersSent) return;
  res.setHeader('X-Quota-Actor', quota.actorType);
  res.setHeader('X-Quota-Feature', quota.feature);
  if (quota.remaining != null) res.setHeader('X-Quota-Remaining', String(quota.remaining));
  if (quota.resetAt) res.setHeader('X-Quota-Reset', quota.resetAt);
}

export function accessError(res, access) {
  setQuotaHeaders(res, access?.quota);
  return res.status(access?.status || 403).json({
    error: access?.message || 'Không thể sử dụng tính năng này',
    code: access?.code || 'access_denied',
    quota: access?.quota,
  });
}

/**
 * Resolve a Supabase account or a signed anonymous guest and consume the
 * corresponding server-side quota before an AI request starts.
 */
export async function resolveAiAccess(req, res, options) {
  const {
    feature,
    action,
    allowGuest = false,
    guestFeature = action,
    guestMax = 0,
    guestIpMax = guestMax * 20,
    guestPeriodDays = 1,
  } = options;

  const authHeader = req.headers?.authorization;
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      return { ok: false, status: 401, code: 'invalid_token', message: 'Authorization header không hợp lệ' };
    }
    const admin = getAdmin();
    if (!admin || !creditsConfigured()) {
      return { ok: false, status: 503, code: 'quota_not_configured', message: 'Hệ thống quota chưa được cấu hình' };
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) {
      return { ok: false, status: 401, code: 'invalid_token', message: 'Phiên đăng nhập không hợp lệ' };
    }

    const gate = await checkAndConsume(user.id, feature, action);
    const remaining = gate.max != null && gate.used != null
      ? Math.max(0, Number(gate.max) - Number(gate.used))
      : gate.remaining;
    const quota = {
      actorType: 'account',
      feature,
      remaining: remaining == null ? null : Number(remaining),
      resetAt: null,
    };
    if (!gate.ok) {
      const status = gate.reason === 'quota_exceeded' || gate.reason === 'insufficient' ? 402 : 403;
      return { ok: false, status, code: gate.reason, message: gate.message, quota };
    }
    setQuotaHeaders(res, quota);
    return { ok: true, actorType: 'account', userId: user.id, gate, quota };
  }

  if (!allowGuest) {
    return { ok: false, status: 401, code: 'auth_required', message: 'Vui lòng đăng nhập để dùng tính năng này' };
  }

  const secret = process.env.GUEST_QUOTA_SECRET;
  const admin = getAdmin();
  if (!secret || !admin) {
    return {
      ok: false,
      status: 503,
      code: 'guest_quota_not_configured',
      message: 'Lượt dùng thử chưa được cấu hình trên máy chủ',
    };
  }

  const guestId = readOrCreateGuestId(req, res, secret);
  const { data, error } = await admin.rpc('consume_guest_quota', {
    p_subject_hash: subjectHash(secret, 'guest', guestId),
    p_ip_hash: subjectHash(secret, 'ip', requestIp(req)),
    p_feature: guestFeature,
    p_max: guestMax,
    p_ip_max: Number(process.env.GUEST_IP_DAILY_MULTIPLIER || 20) * guestMax || guestIpMax,
    p_period_days: guestPeriodDays,
  });

  if (error) {
    return { ok: false, status: 503, code: 'guest_quota_error', message: error.message };
  }

  const quota = {
    actorType: 'guest',
    feature: guestFeature,
    remaining: Math.max(0, Number(data?.max ?? guestMax) - Number(data?.used ?? guestMax)),
    resetAt: resetAt(data?.window_start, guestPeriodDays),
  };
  setQuotaHeaders(res, quota);
  if (!data?.ok) {
    return {
      ok: false,
      status: 429,
      code: data?.err || 'guest_quota_exceeded',
      message: 'Bạn đã hết lượt dùng thử hôm nay. Đăng nhập để nhận quota tài khoản Free.',
      quota,
    };
  }

  return {
    ok: true,
    actorType: 'guest',
    userId: null,
    gate: { ok: true, mode: 'guest_quota', cost: 0 },
    quota,
  };
}

export function withQuota(payload, access) {
  return access?.quota ? { ...payload, quota: access.quota } : payload;
}
