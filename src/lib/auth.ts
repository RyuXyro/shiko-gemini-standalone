// Dipakai di middleware (Edge) dan route handler (Node): hanya Web Crypto.
export const AUTH_COOKIE = 'hub_auth';

export async function authToken(): Promise<string | null> {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;
  const secret = process.env.AUTH_SECRET ?? '';
  const data = new TextEncoder().encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
