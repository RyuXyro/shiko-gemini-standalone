import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, authToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const expected = await authToken();
  const ok = expected !== null && req.cookies.get(AUTH_COOKIE)?.value === expected;
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

// /api/wa-api sengaja tidak dilindungi password: Meta tidak bisa login.
// Endpoint itu diamankan lewat verify token + signature HMAC.
export const config = {
  matcher: ['/dashboard/:path*', '/api/chat', '/api/image', '/api/conversations/:path*'],
};
