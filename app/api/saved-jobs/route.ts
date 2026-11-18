import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';

const RequestBody = z.object({ ids: z.array(z.string().uuid()).max(100) });

export async function POST(request: Request) {
  if (!supabase) return NextResponse.json({ error: 'Job database is not configured.' }, { status: 503 });
  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid saved jobs list.' }, { status: 400 });
  if (!parsed.data.ids.length) return NextResponse.json({ jobs: [] });
  const { data, error } = await supabase.from('jobs')
    .select('id,title,company,location,city,job_type,experience_level,work_mode,source,source_url,posted_at,first_seen_at,verified_at')
    .eq('status', 'active').in('id', parsed.data.ids);
  if (error) return NextResponse.json({ error: 'Could not load saved jobs.' }, { status: 502 });
  const order = new Map(parsed.data.ids.map((id, index) => [id, index]));
  const jobs = (data || []).sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  return NextResponse.json({ jobs });
}
