import { NextResponse } from 'next/server';
import { ensureConversation, saveMessage } from '@/lib/db';
import { pollinationsUrl } from '@/lib/pollinations';

// GET /api/image?prompt=kucing+astronot  -> { url }
export async function GET(req: Request) {
  const prompt = new URL(req.url).searchParams.get('prompt')?.trim();
  if (!prompt) return NextResponse.json({ error: 'Parameter prompt wajib diisi' }, { status: 400 });
  return NextResponse.json({ url: pollinationsUrl(prompt) });
}

// POST { prompt, conversationId } -> { url }, sekaligus menyimpan ke riwayat
export async function POST(req: Request) {
  const { prompt, conversationId } = (await req.json()) as { prompt?: string; conversationId?: string };
  if (!prompt?.trim()) return NextResponse.json({ error: 'Deskripsi gambar kosong' }, { status: 400 });

  const url = pollinationsUrl(prompt);
  if (conversationId) {
    await ensureConversation(conversationId, `Gambar: ${prompt.slice(0, 50)}`);
    await saveMessage(conversationId, 'user', `/image ${prompt}`);
    await saveMessage(conversationId, 'assistant', `![${prompt.replace(/[\[\]]/g, '')}](${url})`);
  }
  return NextResponse.json({ url });
}
