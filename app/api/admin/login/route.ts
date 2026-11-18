import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminCookieName, adminSessionToken } from '@/lib/admin-auth';

const Input = z.object({ secret: z.string().min(1).max(300) });

export async function POST(request: Request) {
  const configured = process.env.ADMIN_SECRET;
  if (!configured) return NextResponse.json({ error: 'Admin access is not configured. Set ADMIN_SECRET on the server.' }, { status: 503 });
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Enter the admin access secret.' }, { status: 400 });
  const supplied = Buffer.from(parsed.data.secret);
  const expected = Buffer.from(configured);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return NextResponse.json({ error: 'The admin secret is incorrect.' }, { status: 401 });
  const token = adminSessionToken(configured);
  const response = NextResponse.json({ ok: true });
  if (token) response.cookies.set(adminCookieName, token, { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return response;
}
