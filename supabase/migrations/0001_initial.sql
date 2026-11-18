create extension if not exists pgcrypto;
create table if not exists public.jobs (
 id uuid primary key default gen_random_uuid(), title text not null, company text not null,
 location text, city text, state text, category text, experience_level text,
 is_fresher boolean, job_type text, work_mode text, description text, requirements text,
 skills text[] not null default '{}', source text not null, source_url text not null,
 canonical_url text not null unique, source_id text, posted_at timestamptz,
 first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
 verified_at timestamptz, status text not null default 'active', ai_classified_at timestamptz,
 check(status in ('active','expired','review'))
);
create index if not exists jobs_active_posted_idx on public.jobs(status,posted_at desc);
create index if not exists jobs_search_idx on public.jobs using gin(to_tsvector('english',coalesce(title,'')||' '||coalesce(company,'')||' '||coalesce(description,'')));
create table if not exists public.collection_runs(id uuid primary key default gen_random_uuid(),started_at timestamptz not null default now(),finished_at timestamptz,status text not null,found_count int default 0,inserted_count int default 0,duplicate_count int default 0,failed_count int default 0,classified_count int default 0,source_results jsonb not null default '{}',error text);
create table if not exists public.ai_usage(id uuid primary key default gen_random_uuid(),run_id uuid references public.collection_runs(id),model text not null,input_tokens int not null default 0,output_tokens int not null default 0,classified_count int not null default 0,input_cost_usd numeric(12,6),output_cost_usd numeric(12,6),created_at timestamptz not null default now());
create table if not exists public.job_evaluations(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs(id) on delete cascade,reviewer text not null,reviewed_at timestamptz not null default now(),role_correct boolean not null,city_correct boolean not null,experience_correct boolean not null,job_type_correct boolean not null,notes text,unique(job_id,reviewer));
create or replace function public.random_unverified_jobs(sample_size int default 50)
returns table(id uuid,title text,company text,city text,category text,experience_level text,job_type text,source_url text)
language sql security definer set search_path=public as $$
 select j.id,j.title,j.company,j.city,j.category,j.experience_level,j.job_type,j.source_url
 from public.jobs j where j.status='active' and j.verified_at is null
 and not exists (select 1 from public.job_evaluations e where e.job_id=j.id)
 order by random() limit greatest(0,least(sample_size,50));
$$;
revoke all on function public.random_unverified_jobs(int) from public,anon,authenticated;
grant execute on function public.random_unverified_jobs(int) to service_role;
alter table public.jobs enable row level security;
create policy "Public may read active jobs" on public.jobs for select using (status='active');
alter table public.collection_runs enable row level security;
create policy "Public may read successful run timestamps" on public.collection_runs for select using (status='success');
alter table public.ai_usage enable row level security;
alter table public.job_evaluations enable row level security;
-- Writes and private evaluation data are service-role only; never expose this key in the browser.
