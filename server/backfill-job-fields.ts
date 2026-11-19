import { loadEnvConfig } from '@next/env';
import * as cheerio from 'cheerio';

loadEnvConfig(process.cwd());

const CITIES: Array<[RegExp, string]> = [
  [/\bbengaluru\b|\bbangalore\b/i, 'Bengaluru'],
  [/\bmumbai\b/i, 'Mumbai'], [/\bpune\b/i, 'Pune'], [/\bhyderabad\b/i, 'Hyderabad'],
  [/\bchennai\b/i, 'Chennai'], [/\bnoida\b/i, 'Noida'], [/\bgurugram\b|\bgurgaon\b/i, 'Gurugram'],
  [/\bdelhi\b/i, 'Delhi NCR'], [/\bkolkata\b/i, 'Kolkata'], [/\bahmedabad\b/i, 'Ahmedabad'],
  [/\bjaipur\b/i, 'Jaipur'], [/\bkochi\b/i, 'Kochi'], [/\bthiruvananthapuram\b/i, 'Thiruvananthapuram'],
  [/\blucknow\b/i, 'Lucknow'], [/\bindore\b/i, 'Indore'], [/\bchandigarh\b/i, 'Chandigarh'],
];

const ROLES: Array<[RegExp, string]> = [
  [/\b(finance|financial|accounting|accountant|accounts|treasury|audit|tax|investment|credit|collections|lending|insurance|corporate development)\b/i, 'Finance'],
  [/\b(product|product manager|product owner|product analyst)\b/i, 'Product'],
  [/\b(data|analytics|business intelligence|machine learning|artificial intelligence|data scientist|ml researcher)\b/i, 'Data'],
  [/\b(design|designer|ux|ui\b|visual designer)\b/i, 'Design'],
  [/\b(sales|account executive|business development|sales enablement|relationship manager|gtm)\b/i, 'Sales'],
  [/\b(marketing|growth|brand)\b/i, 'Marketing'],
  [/\b(operations|program management|program manager|project manager|coordinator|procurement|inventory|supervisor|strategy|trainer|compliance)\b/i, 'Operations'],
  [/\b(human resources|\bhr\b|recruiter|talent acquisition|people partner|hrbp)\b/i, 'Human Resources'],
  [/\b(customer support|technical support|customer success|support specialist|technical account|onboarding specialist)\b/i, 'Customer Support'],
  [/\b(engineer|engineering|software|developer|devops|sdet|backend|frontend|full.?stack|\bqa\b|quality check|mechanical|robotics|technology|technical|hardware|architect|\bsre\b)\b/i, 'Engineering'],
];

function fromEvidence(patterns: Array<[RegExp, string]>, text: string) {
  return patterns.find(([pattern]) => pattern.test(text))?.[1] || null;
}

function modeFromEvidence(text: string) {
  if (/\bhybrid\b/i.test(text)) return 'Hybrid';
  if (/\b(remote|fully remote|work from home|\bwfh\b|work remotely)\b/i.test(text)) return 'Remote';
  if (/\b(on[ -]?site|onsite|in[ -]office|office[ -]based|in[ -]person|work from (?:the )?office)\b/i.test(text)) return 'On-site';
  return null;
}

function experienceFromEvidence(title: string, description: string, jobType: string | null) {
  if (jobType === 'Internship' || /\bintern(ship)?\b/i.test(title)) return 'Internship';
  const text = `${title} ${description}`;
  if (/\b(fresher|entry[ -]?level|new grad(?:uate)?|recent graduate|no prior experience)\b/i.test(text)) return 'Entry level';
  const experiencePhrases = [...text.matchAll(/(\d{1,2})\s*(?:(?:[-–]|to)\s*(\d{1,2})\s*)?\+?\s*(?:years?|yrs?)\b/gi)];
  const values = experiencePhrases.flatMap((match) => {
    const start = match.index || 0;
    const context = text.slice(Math.max(0, start - 180), Math.min(text.length, start + match[0].length + 110));
    const requirementEvidence = /\b(experience|expertise|qualifications?|required|requires|minimum|at least|must have|candidate|looking for|non[ -]?negotiable|need to bring|what you bring|your background|years in (?:this|the|a) role)\b/i.test(context);
    const titleRequirement = start < title.length && /\bexperience\s*:/i.test(title);
    if (!requirementEvidence && !titleRequirement) return [];
    return [{ min: Number(match[1]), max: Number(match[2] || match[1]) }];
  });
  if (values.length) {
    const { min, max } = values.sort((a, b) => a.min - b.min)[0];
    if (max <= 1) return '0 to 1 years';
    if (max <= 2) return min === 0 ? 'Entry level' : '1 to 2 years';
    return 'Experienced';
  }
  if (/\b(senior|staff|principal|director|vice president|\bvp\b|head of)\b/i.test(title)) return 'Experienced';
  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are missing from .env.local.');
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from('jobs').select('id,title,location,description,category,city,work_mode,job_type,experience_level,status').eq('status', 'active');
  if (error) throw error;
  const rows = data || [];
  const grouped = new Map<string, { patch: Record<string, string>; ids: string[] }>();
  for (const job of rows) {
    const $ = cheerio.load(job.description || '');
    const evidence = `${job.title || ''} ${job.location || ''} ${$.text().replace(/\s+/g, ' ')}`;
    const patch: Record<string, string> = {};
    if (!job.category || !job.category.trim() || process.argv.includes('--reclassify')) {
      const role = fromEvidence(ROLES, job.title || '');
      if (role) patch.category = role;
    }
    if (!job.city || !job.city.trim()) {
      const city = fromEvidence(CITIES, job.location || '');
      if (city) patch.city = city;
    }
    if (!job.work_mode || /^(not specified|other)$/i.test(job.work_mode.trim())) {
      const mode = modeFromEvidence(evidence);
      if (mode) patch.work_mode = mode;
    }
    if (!job.experience_level || /^(not specified|other)$/i.test(job.experience_level.trim())) {
      const level = experienceFromEvidence(job.title || '', $.text().replace(/\s+/g, ' '), job.job_type);
      if (level) patch.experience_level = level;
    }
    if (Object.keys(patch).length) {
      const key = JSON.stringify(patch);
      const group = grouped.get(key) || { patch, ids: [] };
      group.ids.push(job.id);
      grouped.set(key, group);
    }
  }
  let changed = 0;
  for (const group of grouped.values()) {
    for (let index = 0; index < group.ids.length; index += 100) {
      const ids = group.ids.slice(index, index + 100);
      const { error: updateError } = await db.from('jobs').update(group.patch).in('id', ids);
      if (updateError) throw new Error(`Could not update job fields: ${updateError.message}`);
      changed += ids.length;
    }
  }
  const { data: after, error: verifyError } = await db.from('jobs').select('category,city,work_mode,experience_level').eq('status', 'active');
  if (verifyError) throw verifyError;
  const result = after || [];
  const total = result.length;
  const percentage = (n: number) => total ? Number((n / total * 100).toFixed(1)) : 0;
  console.log(JSON.stringify({
    activeListings: total,
    listingsUpdated: changed,
    populated: {
      role: { count: result.filter((j) => Boolean(j.category?.trim())).length, percent: percentage(result.filter((j) => Boolean(j.category?.trim())).length) },
      city: { count: result.filter((j) => Boolean(j.city?.trim())).length, percent: percentage(result.filter((j) => Boolean(j.city?.trim())).length) },
      workMode: { count: result.filter((j) => Boolean(j.work_mode?.trim()) && !/^(not specified|other)$/i.test(j.work_mode.trim())).length, percent: percentage(result.filter((j) => Boolean(j.work_mode?.trim()) && !/^(not specified|other)$/i.test(j.work_mode.trim())).length) },
      experience: { count: result.filter((j) => Boolean(j.experience_level?.trim()) && !/^(not specified|other)$/i.test(j.experience_level.trim())).length, percent: percentage(result.filter((j) => Boolean(j.experience_level?.trim()) && !/^(not specified|other)$/i.test(j.experience_level.trim())).length) },
    },
  }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
