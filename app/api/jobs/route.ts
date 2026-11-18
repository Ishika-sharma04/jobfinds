import { NextRequest, NextResponse } from 'next/server';
import { searchJobs } from '@/lib/jobs';

export const dynamic = 'force-dynamic';
const allowed = new Set(['city', 'role', 'type', 'experience', 'mode']);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key === 'q') filters.q = value.slice(0, 100);
    else if (key === 'page') filters.page = value;
    else if (allowed.has(key)) filters[key] = value.slice(0, 80);
  }
  const page = Math.max(1, Math.min(500, Number(filters.page) || 1));
  const result = await searchJobs({ ...filters, page, includeLastUpdated: params.get('includeLastUpdated') === '1' });
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}
