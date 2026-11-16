import crypto from 'node:crypto';
import { after, NextResponse, type NextRequest } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { deleteConversation, ensureConversation, getRecentMessages, saveMessage } from '@/lib/db';
import { pollinationsUrl } from '@/lib/pollinations';
import { WA_SYSTEM_PROMPT } from '@/lib/prompts';
import { sendImage, sendText } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface WaMessage { id: string; from: string; type: string; text?: { body: string } }
interface WaPayload {
  entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[];
}

// ── 1. Verifikasi webhook (Meta memanggil GET sekali saat setup) ──
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// ── 2. Pesan masuk ──
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(raw) as WaPayload;
  const messages = (payload.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) => c.value?.messages ?? []);

  // Balas 200 secepatnya (Meta mengulang kiriman jika lambat), proses di belakang.
  after(async () => {
    for (const msg of messages) {
      try {
        await handleMessage(msg);
      } catch (err) {
        console.error('[wa] gagal memproses pesan', err);
        await sendText(msg.from, 'Maaf, terjadi kesalahan. Coba lagi sebentar lagi.').catch(() => {});
      }
    }
  });
  return NextResponse.json({ ok: true });
}

async function handleMessage(msg: WaMessage) {
  const allowed = (process.env.WHATSAPP_ALLOWED_NUMBERS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(msg.from)) return;
  if (msg.type !== 'text' || !msg.text?.body) {
    await sendText(msg.from, 'Saat ini saya hanya bisa membaca pesan teks.');
    return;
  }

  const text = msg.text.body.trim();
  const convId = `wa-${msg.from}`;

  // /image <deskripsi>
  if (/^\/image(\s|$)/i.test(text)) {
    const prompt = text.replace(/^\/image\s*/i, '').trim();
    if (!prompt) return void (await sendText(msg.from, 'Format: /image <deskripsi gambar>'));
    await sendText(msg.from, 'Sedang membuat gambar, tunggu sebentar…');
    await sendImage(msg.from, pollinationsUrl(prompt), prompt);
    return;
  }

  if (/^\/reset$/i.test(text)) {
    await deleteConversation(convId);
    return void (await sendText(msg.from, 'Riwayat percakapan dihapus.'));
  }
  if (/^\/help$/i.test(text)) {
    return void (await sendText(msg.from, 'Perintah:\n/image <deskripsi> – buat gambar\n/reset – hapus riwayat\nSelain itu, kirim pesan biasa untuk ngobrol.'));
  }

  // Chat teks biasa dengan konteks 10 pesan terakhir
  const history = await getRecentMessages(convId, 10);
  const { text: answer } = await generateText({
    model: google(process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'),
    system: WA_SYSTEM_PROMPT,
    messages: [...history, { role: 'user' as const, content: text }],
  });

  await ensureConversation(convId, `WhatsApp ${msg.from}`);
  await saveMessage(convId, 'user', text);
  await saveMessage(convId, 'assistant', answer);
  await sendText(msg.from, answer);
}

function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production'; // wajib di production
  if (!header) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
