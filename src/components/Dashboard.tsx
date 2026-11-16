'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { DEFAULT_SYSTEM_PROMPT, PERSONAS } from '@/lib/prompts';

type Conv = { id: string; title: string; updated_at: string };

export default function Dashboard() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState('');
  const [initial, setInitial] = useState<Message[]>([]);
  const [ready, setReady] = useState(false);
  const [dbOn, setDbOn] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptOpen, setPromptOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function refresh() {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    const data = await res.json();
    setConvs(data.conversations);
    setDbOn(data.dbEnabled);
  }

  function newChat() {
    setInitial([]);
    setActiveId(crypto.randomUUID());
    setReady(true);
    setSidebarOpen(false);
  }

  async function openChat(id: string) {
    setReady(false);
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setInitial(
      (data.messages as { id: number; role: 'user' | 'assistant'; content: string }[]).map((m) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
      })),
    );
    setActiveId(id);
    setReady(true);
    setSidebarOpen(false);
  }

  async function removeChat(id: string) {
    await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (id === activeId) newChat();
    refresh();
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function savePrompt(value: string) {
    setSystemPrompt(value);
    localStorage.setItem('hub_system_prompt', value);
    setPromptOpen(false);
  }

  useEffect(() => {
    newChat();
    refresh();
    const saved = localStorage.getItem('hub_system_prompt');
    if (saved) setSystemPrompt(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-72 flex-col bg-navy text-mist transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          <p className="mb-4 font-display text-xl font-semibold text-paper">Gemini Hub</p>
          <button
            onClick={newChat}
            className="w-full rounded-md border border-mist/30 px-3 py-2 text-left text-paper hover:bg-white/5"
          >
            Percakapan baru
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2" aria-label="Riwayat chat">
          {!dbOn && (
            <p className="px-2 text-sm text-mist/70">
              Riwayat tidak disimpan. Isi DATABASE_URL untuk mengaktifkannya.
            </p>
          )}
          {dbOn && convs.length === 0 && (
            <p className="px-2 text-sm text-mist/70">Belum ada percakapan tersimpan.</p>
          )}
          <ul className="space-y-0.5">
            {convs.map((c) => (
              <li key={c.id} className="group flex items-center">
                <button
                  onClick={() => openChat(c.id)}
                  className={`min-w-0 flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${
                    c.id === activeId ? 'bg-white/10 text-paper' : ''
                  }`}
                >
                  {c.title}
                </button>
                <button
                  onClick={() => removeChat(c.id)}
                  aria-label={`Hapus ${c.title}`}
                  className="px-2 text-mist/60 opacity-0 hover:text-paper focus-visible:opacity-100 group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex gap-2 border-t border-white/10 p-3 text-sm">
          <button onClick={() => setPromptOpen(true)} className="flex-1 rounded-md px-3 py-2 text-left hover:bg-white/5">
            System prompt
          </button>
          <button onClick={logout} className="rounded-md px-3 py-2 hover:bg-white/5">
            Keluar
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <button
          aria-label="Tutup sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
        />
      )}

      {/* Chat */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-ink/10 px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-md border border-ink/20 px-3 py-1.5 text-sm">
            Menu
          </button>
          <span className="font-display font-semibold">Gemini Hub</span>
        </header>
        {ready && (
          <ChatPane
            key={activeId}
            id={activeId}
            initialMessages={initial}
            systemPrompt={systemPrompt}
            onSaved={refresh}
          />
        )}
      </main>

      {promptOpen && (
        <PromptDialog value={systemPrompt} onSave={savePrompt} onClose={() => setPromptOpen(false)} />
      )}
    </div>
  );
}

/* ───────────────────────── Chat pane ───────────────────────── */

function ChatPane(props: {
  id: string;
  initialMessages: Message[];
  systemPrompt: string;
  onSaved: () => void;
}) {
  const { id, initialMessages, systemPrompt, onSaved } = props;
  const { messages, input, setInput, handleInputChange, handleSubmit, setMessages, status, error, stop } = useChat({
    api: '/api/chat',
    id,
    initialMessages,
    onFinish: onSaved,
  });
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming' || imageBusy;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, imageBusy]);

  async function makeImage() {
    const prompt = input.trim();
    setInput('');
    setImageError('');
    setImageBusy(true);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: `/image ${prompt}` }]);
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, conversationId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gagal membuat gambar');
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `![${prompt.replace(/[\[\]]/g, '')}](${data.url})` },
      ]);
      onSaved();
    } catch (e) {
      setImageError((e as Error).message);
    } finally {
      setImageBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !input.trim()) return;
    if (mode === 'image') void makeImage();
    else handleSubmit(e, { body: { conversationId: id, systemPrompt } });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
          {messages.length === 0 && (
            <div className="pt-16">
              <h2 className="font-display text-3xl font-semibold">Mau mulai dari mana?</h2>
              <p className="mt-2 max-w-md text-ink/70">
                Tulis pertanyaan untuk Gemini, atau pindah ke mode Gambar untuk membuat gambar dari deskripsi.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}
          {status === 'submitted' && <p className="text-sm text-ink/60">Gemini sedang berpikir…</p>}
          {imageBusy && <p className="text-sm text-ink/60">Membuat gambar…</p>}
          {(error || imageError) && (
            <p role="alert" className="rounded-md border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-ember">
              {imageError || error?.message || 'Terjadi kesalahan'}
            </p>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="border-t border-ink/10 bg-paper px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 inline-flex rounded-md border border-ink/15 p-0.5 text-sm" role="group" aria-label="Mode">
            {(['text', 'image'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded px-3 py-1 ${mode === m ? 'bg-ink text-paper' : 'text-ink/70'}`}
              >
                {m === 'text' ? 'Teks' : 'Gambar'}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              placeholder={mode === 'image' ? 'Deskripsikan gambar yang ingin dibuat' : 'Tulis pesan'}
              className="min-h-[3rem] flex-1 resize-none rounded-md border border-ink/20 bg-white px-3 py-2"
            />
            {status === 'streaming' ? (
              <button type="button" onClick={() => stop()} className="rounded-md border border-ink/30 px-4 py-2">
                Berhenti
              </button>
            ) : (
              <button
                disabled={busy || !input.trim()}
                className="rounded-md bg-signal px-4 py-2 font-medium text-white disabled:opacity-50"
              >
                {mode === 'image' ? 'Buat gambar' : 'Kirim'}
              </button>
            )}
          </div>
        </div>
      </form>
    </>
  );
}

const IMAGE_MD = /^!\[([^\]]*)\]\((https?:[^)\s]+)\)$/;

function Bubble({ role, content }: { role: string; content: string }) {
  const img = content.match(IMAGE_MD);
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-paper">
          {content}
        </p>
      </div>
    );
  }
  if (img) {
    return (
      <figure className="space-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img[2]}
          alt={img[1]}
          className="min-h-48 w-full max-w-md rounded-lg bg-mist/40"
        />
        <figcaption className="text-sm text-ink/60">
          <a href={img[2]} target="_blank" rel="noreferrer" className="underline">
            Buka ukuran penuh
          </a>
        </figcaption>
      </figure>
    );
  }
  return <div className="max-w-[85%] whitespace-pre-wrap leading-relaxed">{content}</div>;
}

/* ───────────────────────── System prompt ───────────────────────── */

function PromptDialog(props: { value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [text, setText] = useState(props.value);
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="System prompt">
      <div className="w-full max-w-xl space-y-4 rounded-xl bg-paper p-6">
        <h2 className="font-display text-2xl font-semibold">System prompt</h2>
        <p className="text-sm text-ink/70">
          Instruksi ini menentukan persona Gemini. Berlaku untuk chat berikutnya dan tersimpan di browser ini.
        </p>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setText(p.prompt)}
              className="rounded-full border border-ink/20 px-3 py-1 text-sm hover:bg-ink/5"
            >
              {p.name}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          className="w-full rounded-md border border-ink/20 bg-white px-3 py-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button onClick={props.onClose} className="rounded-md px-4 py-2">Batal</button>
          <button
            onClick={() => props.onSave(text.trim() || DEFAULT_SYSTEM_PROMPT)}
            className="rounded-md bg-signal px-4 py-2 font-medium text-white"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
