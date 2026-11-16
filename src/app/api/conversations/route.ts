import { NextResponse } from 'next/server';
import { dbEnabled, listConversations } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json({ conversations: await listConversations(), dbEnabled });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
