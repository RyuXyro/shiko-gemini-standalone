import { NextResponse } from 'next/server';
import { deleteConversation, getMessages } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json({ messages: await getMessages(id) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  await deleteConversation(id);
  return NextResponse.json({ ok: true });
}
