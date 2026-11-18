import { NextResponse } from 'next/server';
import { adminCookieName } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, '', { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 0 });
  return response;
}
