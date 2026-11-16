'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace('/dashboard');
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Gagal masuk');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-navy px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
        <h1 className="font-display text-4xl font-semibold text-paper">Gemini Hub</h1>
        <p className="text-mist">Masukkan password untuk membuka dashboard.</p>
        <label className="block">
          <span className="sr-only">Password</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-mist/30 bg-navy px-4 py-3 text-paper placeholder:text-mist/60"
          />
        </label>
        {error && <p role="alert" className="text-sm text-[#F0A08F]">{error}</p>}
        <button
          disabled={loading || !password}
          className="w-full rounded-md bg-signal px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}
