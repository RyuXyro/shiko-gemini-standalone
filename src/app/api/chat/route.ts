import { google } from '@ai-sdk/google';
import { streamText, type Message } from 'ai';
import { ensureConversation, saveMessage } from '@/lib/db';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/prompts';

export const maxDuration = 60;

// Gambar di riwayat dikirim ke Gemini sebagai teks pendek, bukan URL panjang.
const stripImages = (text: string) => text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '[Gambar: $1]');

export async function POST(req: Request) {
  const { messages, conversationId, systemPrompt } = (await req.json()) as {
    messages: Message[];
    conversationId?: string;
    systemPrompt?: string;
  };

  const last = messages.at(-1);
  if (conversationId && last?.role === 'user') {
    await ensureConversation(conversationId, last.content.slice(0, 60));
    await saveMessage(conversationId, 'user', last.content);
  }

  const result = streamText({
    model: google(process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'),
    system: systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    messages: messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: stripImages(m.content),
    })),
    onFinish: async ({ text }) => {
      if (conversationId) await saveMessage(conversationId, 'assistant', text);
    },
  });

  return result.toDataStreamResponse({
    getErrorMessage: (e) => (e instanceof Error ? e.message : 'Terjadi kesalahan pada Gemini'),
  });
}
