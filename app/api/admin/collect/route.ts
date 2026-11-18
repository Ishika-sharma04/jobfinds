import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';
import { adminSupabase } from '@/lib/supabase';
import { collectAndStore } from '@/server/ingest';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST() {
  const jar = await cookies();
  if (!isValidAdminSession(jar.get(adminCookieName)?.value)) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 });
  if (!adminSupabase) return NextResponse.json({ error: 'Supabase server credentials are not configured.' }, { status: 503 });

  const { data: running } = await adminSupabase.from('collection_runs').select('started_at').eq('status', 'running').order('started_at', { ascending: false }).limit(1).maybeSingle();
  if (running && Date.now() - new Date(running.started_at).getTime() < 15 * 60 * 1000) {
    return NextResponse.json({ error: 'A collection is already running. Check back shortly.' }, { status: 409 });
  }

  try {
    const result = await collectAndStore(adminSupabase);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin-triggered collection failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Collection failed. Review source status and collection history.' }, { status: 500 });
  }
}
