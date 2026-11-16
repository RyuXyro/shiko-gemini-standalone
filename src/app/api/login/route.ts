import { NextResponse } from 'next/server';
import { AUTH_COOKIE, authToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: 'DASHBOARD_PASSWORD belum diatur di server' }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: 'Password salah' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, (await authToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
