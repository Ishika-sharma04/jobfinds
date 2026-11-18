import type { SupabaseClient } from '@supabase/supabase-js';
import { collectAll } from './collectors/ats';
import { sourceStatuses } from './collectors/status';
import { deduplicate, key } from './deduplication';
import { classifyJobs, GEMINI_BATCH_DELAY_MS, GEMINI_BATCH_SIZE } from './classification/gemini';
import type { RawJob } from './collectors/types';

function price(envName: string, tokens: number) {
  const raw = process.env[envName];
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? tokens * value / 1_000_000 : null;
}

type Existing = Pick<RawJob, 'title' | 'company' | 'location' | 'description'> & {
  id: string;
  canonical_url: string;
  ai_classified_at: string | null;
  status: string;
  is_fresher: boolean | null;
};

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sourceEvidentType(job: RawJob) {
  const evidence = `${job.employmentType || ''} ${job.title}`.toLowerCase().replace(/[_–—]/g, ' ');
  if (/\bintern(ship)?\b/.test(evidence)) {
    return { job_type: 'Internship', experience_level: 'Internship', is_fresher: true };
  }
  if (/\bfull\s*time\b/.test(evidence)) return { job_type: 'Full-time', experience_level: 'Not specified', is_fresher: null };
  if (/\bpart\s*time\b/.test(evidence)) return { job_type: 'Part-time', experience_level: 'Not specified', is_fresher: null };
  if (/\bcontract(?:or)?\b/.test(evidence)) return { job_type: 'Contract', experience_level: 'Not specified', is_fresher: null };
  return { job_type: 'Other', experience_level: 'Not specified', is_fresher: null };
}

export async function collectAndStore(db: SupabaseClient) {
  const { data: run, error: runError } = await db.from('collection_runs').insert({ status: 'running' }).select('id').single();
  if (runError || !run) throw runError || new Error('Could not create collection run');

  let found = 0;
  let inserted = 0;
  let duplicates = 0;
  let failed = 0;
  let classified = 0;
  let classificationFailures = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const raw = await collectAll();
    found = raw.length;
    const unique = deduplicate(raw);
    duplicates = raw.length - unique.length;

    const existingRows: Existing[] = [];
    // Long canonical application URLs can overflow PostgREST request headers
    // when too many are placed into one `in` filter.
    for (let i = 0; i < unique.length; i += 20) {
      const batch = unique.slice(i, i + 20).map(key);
      if (!batch.length) continue;
      const { data, error } = await db
        .from('jobs')
        .select('id,canonical_url,title,company,location,description,ai_classified_at,status,is_fresher')
        .in('canonical_url', batch);
      if (error) throw error;
      if (data) existingRows.push(...data as Existing[]);
    }

    const existingByUrl = new Map(existingRows.map((row) => [row.canonical_url, row]));
    const classificationByUrl = new Map<string, Awaited<ReturnType<typeof classifyJobs>>['results'][number]['data']>();
    const pending = unique.filter((job) => {
      const old = existingByUrl.get(key(job));
      return !(old?.ai_classified_at && old.description === job.description);
    });

    for (let i = 0; i < pending.length; i += GEMINI_BATCH_SIZE) {
      const batch = pending.slice(i, i + GEMINI_BATCH_SIZE);
      const result = await classifyJobs(batch);
      inputTokens += result.inputTokens;
      outputTokens += result.outputTokens;
      for (const item of result.results) {
        const job = batch[item.index];
        if (!job) continue;
        classificationByUrl.set(key(job), item.data);
        if (item.data) classified++;
        else classificationFailures++;
      }
      if (result.error) console.error('Gemini batch classification failed:', result.error);
      if (result.quotaExhausted) {
        for (const job of pending.slice(i + batch.length)) {
          classificationByUrl.set(key(job), null);
          classificationFailures++;
        }
        console.error('Gemini quota is exhausted; remaining jobs will be saved without AI tags.');
        break;
      }
      if (i + GEMINI_BATCH_SIZE < pending.length) await pause(GEMINI_BATCH_DELAY_MS);
    }

    for (const job of unique) {
      try {
        const canonical = key(job);
        const old = existingByUrl.get(canonical);
        const cached = Boolean(old?.ai_classified_at && old.description === job.description);
        const result = cached ? null : classificationByUrl.get(canonical) || null;
        const classification = result
          ? { ...result, requirements: result.requirements.join('\n') }
          : !cached
            ? { category: null, city: null, state: null, ...sourceEvidentType(job), work_mode: 'Not specified', skills: [], requirements: null }
            : {};
        const row: any = {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          source: job.source,
          source_url: job.url,
          canonical_url: canonical,
          source_id: job.sourceId,
          posted_at: job.postedAt || null,
          last_seen_at: new Date().toISOString(),
          status: result?.is_fresher === false || (!result && old?.is_fresher === false) ? 'review' : 'active',
          ...classification,
          ai_classified_at: result ? new Date().toISOString() : cached ? old?.ai_classified_at : null,
        };
        const { data: saved, error } = await db.from('jobs').upsert(row, { onConflict: 'canonical_url', ignoreDuplicates: true }).select('id');
        if (error) throw error;
        if (saved?.length) inserted++;
        else {
          duplicates++;
          const { error: updateError } = await db.from('jobs').update(row).eq('canonical_url', canonical);
          if (updateError) throw updateError;
        }
      } catch (error) {
        failed++;
        console.error('Listing ingest failed:', job.url, error instanceof Error ? error.message : error);
      }
    }

    const sourceFailures = Object.values(sourceStatuses).filter((source) => source.status === 'failed').length;
    failed += sourceFailures + classificationFailures;
    const inputCost = price('GEMINI_INPUT_USD_PER_MILLION', inputTokens);
    const outputCost = price('GEMINI_OUTPUT_USD_PER_MILLION', outputTokens);
    const { error: usageError } = await db.from('ai_usage').insert({
      run_id: run.id,
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      classified_count: classified,
      input_cost_usd: inputCost,
      output_cost_usd: outputCost,
    });
    if (usageError) console.error('Could not store Gemini usage:', usageError.message);

    const sources = Object.values(sourceStatuses);
    const canExpire = sources.length > 0 && sources.every((source) => source.status === 'success');
    if (canExpire) {
      const staleAt = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await db.from('jobs').update({ status: 'expired' }).eq('status', 'active').lt('last_seen_at', staleAt);
      if (error) console.error('Could not expire stale listings:', error.message);
    }

    const { error: finishError } = await db.from('collection_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      found_count: found,
      inserted_count: inserted,
      duplicate_count: duplicates,
      failed_count: failed,
      classified_count: classified,
      source_results: sourceStatuses,
    }).eq('id', run.id);
    if (finishError) throw finishError;
    return { found, inserted, duplicateCount: duplicates, failed, classified, classificationFailures, inputTokens, outputTokens, sourceStatuses };
  } catch (error) {
    await db.from('collection_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      found_count: found,
      error: error instanceof Error ? error.message : 'Collection failed',
      source_results: sourceStatuses,
    }).eq('id', run.id);
    throw error;
  }
}
