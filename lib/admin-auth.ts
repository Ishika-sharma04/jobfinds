import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'fresherjobs_admin';

export function adminSessionToken(secret = process.env.ADMIN_SECRET) {
  return secret ? createHmac('sha256', secret).update('FresherJobs India admin session v1').digest('hex') : null;
}

export function isValidAdminSession(value: string | undefined | null) {
  const expected = adminSessionToken();
  if (!expected || !value) return false;
  const a = Buffer.from(value, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export const adminCookieName = COOKIE_NAME;
