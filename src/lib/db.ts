import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
const sql = url ? neon(url) : null;

/** false jika DATABASE_URL kosong: aplikasi tetap jalan, hanya tanpa riwayat. */
export const dbEnabled = Boolean(sql);

export type Role = 'user' | 'assistant';
export interface ConversationRow { id: string; title: string; updated_at: string }
export interface MessageRow { id: number; role: Role; content: string }

let ready: Promise<void> | null = null;

// Tabel dibuat otomatis saat pertama dipakai, tidak perlu migrasi manual.
function init(): Promise<void> {
  if (!sql) return Promise.resolve();
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Percakapan baru',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS messages_conv_idx ON messages (conversation_id, id)`;
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

export async function ensureConversation(id: string, title: string) {
  if (!sql) return;
  await init();
  await sql`INSERT INTO conversations (id, title) VALUES (${id}, ${title})
            ON CONFLICT (id) DO UPDATE SET updated_at = now()`;
}

export async function saveMessage(conversationId: string, role: Role, content: string) {
  if (!sql || !content) return;
  await init();
  await sql`INSERT INTO messages (conversation_id, role, content) VALUES (${conversationId}, ${role}, ${content})`;
  await sql`UPDATE conversations SET updated_at = now() WHERE id = ${conversationId}`;
}

export async function listConversations(): Promise<ConversationRow[]> {
  if (!sql) return [];
  await init();
  const rows = await sql`SELECT id, title, updated_at FROM conversations
                         WHERE id NOT LIKE 'wa-%' ORDER BY updated_at DESC LIMIT 50`;
  return rows as ConversationRow[];
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  if (!sql) return [];
  await init();
  const rows = await sql`SELECT id, role, content FROM messages
                         WHERE conversation_id = ${conversationId} ORDER BY id ASC`;
  return rows as MessageRow[];
}

export async function getRecentMessages(conversationId: string, limit = 10) {
  if (!sql) return [];
  await init();
  const rows = await sql`SELECT role, content FROM (
      SELECT id, role, content FROM messages
      WHERE conversation_id = ${conversationId} ORDER BY id DESC LIMIT ${limit}
    ) t ORDER BY id ASC`;
  return rows as { role: Role; content: string }[];
}

export async function deleteConversation(id: string) {
  if (!sql) return;
  await init();
  await sql`DELETE FROM conversations WHERE id = ${id}`;
}
