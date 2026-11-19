'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, LoaderCircle, MapPin, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import type { JobSummary } from '@/lib/types';
import SaveJobButton from '@/components/SaveJobButton';
import GoalJobTypeFilter from '@/components/GoalJobTypeFilter';

type Filters = { q: string; city: string; role: string; type: string; experience: string; mode: string; page: number };
type Result = { jobs: JobSummary[]; total: number; lastUpdated: string | null; configured: boolean };
type Props = { initial: Result; filters: Filters; pages: number; forcedType?: string; options: { city: readonly string[]; role: readonly string[]; experience: readonly string[]; mode: readonly string[] } };

const selectMeta = {
  city: { label: 'Location', placeholder: 'All locations' },
  role: { label: 'Role', placeholder: 'All roles' },
  type: { label: 'Job type', placeholder: 'Any type' },
  experience: { label: 'Experience', placeholder: 'Any experience' },
  mode: { label: 'Work mode', placeholder: 'Any work mode' },
} as const;

function JobCard({ job }: { job: JobSummary }) {
  const workMode = job.work_mode && !/^(not specified|other)$/i.test(job.work_mode) ? job.work_mode : 'Work mode not specified';
  const role = job.category && !/^(not specified|other)$/i.test(job.category) ? job.category : 'Role category not classified';
  const experience = job.experience_level && !/^(not specified|other)$/i.test(job.experience_level) ? job.experience_level : 'Experience not specified';
  const meta = [job.city || job.location, job.job_type, experience, workMode, role].filter((value) => value && !/^(not specified|other)$/i.test(value));
  const date = job.posted_at || job.first_seen_at;
  return <article className="job"><div className="jobtop"><Link className="job-overview" href={`/jobs/${job.id}`}><div className="company-mark">{job.company.slice(0, 1).toUpperCase()}</div><div className="job-heading"><div className="jobtitle">{job.title}</div><div className="company">{job.company}</div></div></Link><div className="job-actions"><span className="badge">{job.is_fresher === true ? 'Early-career match' : 'Fresher status unverified'}</span><SaveJobButton id={job.id}/><Link className="card-apply" href={`/jobs/${job.id}`}>Details <ArrowUpRight size={14}/></Link></div></div>
    <div className="tags">{meta.map((item, index) => <span className={`tag ${index === 1 ? 'blue' : ''}`} key={`${item}-${index}`}>{index === 0 && <MapPin size={11} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 3 }}/ >}{item}</span>)}</div>
    <div className="jobfoot"><span className="source-mark">Company career listing | {job.verified_at ? 'Manually verified' : 'details on employer site'}</span><span>{date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently listed'}</span></div>
  </article>;
}

export default function JobBrowser({ initial, filters: initialFilters, forcedType, options }: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [draftQuery, setDraftQuery] = useState(initialFilters.q);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [personalGoal, setPersonalGoal] = useState<'internship' | 'job' | 'both' | null>(null);
  const controller = useRef<AbortController | null>(null);
  const filtersRef = useRef(filters);
  const firstFilterEffect = useRef(true);
  filtersRef.current = filters;

  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('fresherjobs.profile.v1') || 'null');
      if (['internship', 'job', 'both'].includes(profile?.goal)) setPersonalGoal(profile.goal);
    } catch { /* Leave the job type selector available if browser storage is unavailable. */ }
  }, []);

  const currentType = forcedType || (personalGoal === 'internship' ? 'Internship' : personalGoal === 'job' ? 'Full-time' : filters.type);
  const request = useCallback(async (next: Filters, includeTimestamp = false) => {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const params = new URLSearchParams();
    for (const key of ['q', 'city', 'role', 'experience', 'mode'] as const) if (next[key]) params.set(key, next[key]);
    const type = forcedType || next.type;
    if (type) params.set('type', type);
    params.set('page', String(next.page));
    if (includeTimestamp) params.set('includeLastUpdated', '1');
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/jobs?${params.toString()}`, { signal: abort.signal, cache: 'no-store' });
      const data = await response.json() as Result;
      if (!response.ok) throw new Error('Could not refresh listings. Please try again.');
      setResult((previous) => ({ ...data, lastUpdated: data.lastUpdated || previous.lastUpdated }));
      const url = new URL(window.location.href);
      for (const key of ['q', 'city', 'role', 'type', 'experience', 'mode', 'page']) url.searchParams.delete(key);
      for (const [key, value] of params.entries()) if (key !== 'includeLastUpdated' && value) url.searchParams.set(key, value);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    } catch (reason) {
      if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
    } finally {
      if (!abort.signal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, [forcedType]);

  useEffect(() => {
    if (firstFilterEffect.current) { firstFilterEffect.current = false; return; }
    const handle = window.setTimeout(() => { void request(filters); }, 160);
    return () => window.clearTimeout(handle);
  }, [filters, request]);

  useEffect(() => {
    const refresh = () => { setRefreshing(true); void request(filtersRef.current, true); };
    window.addEventListener('fresherjobs:refresh-openings', refresh);
    if (new URLSearchParams(window.location.search).get('refresh') === '1') refresh();
    return () => window.removeEventListener('fresherjobs:refresh-openings', refresh);
  }, [request]);

  const activeFilters = useMemo(() => (['city', 'role', 'type', 'experience', 'mode'] as const).filter((key) => Boolean(key === 'type' ? currentType : filters[key])), [filters, currentType]);
  const pageCount = Math.max(1, Math.ceil(result.total / 20));
  function change(key: keyof Omit<Filters, 'page'>, value: string) {
    const next = { ...filters, [key]: value, page: 1 };
    if (key === 'q') setDraftQuery(value);
    setFilters(next);
  }
  function clearFilters() {
    setDraftQuery('');
    setFilters({ q: '', city: '', role: '', type: forcedType || (personalGoal === 'internship' ? 'Internship' : personalGoal === 'job' ? 'Full-time' : ''), experience: '', mode: '', page: 1 });
  }
  function refresh() { setRefreshing(true); void request(filters, true); }
  function openProfileIfNeeded(event?: React.PointerEvent<HTMLDivElement>) {
    let hasProfile = false;
    try { hasProfile = Boolean(localStorage.getItem('fresherjobs.profile.v1')); } catch { /* Prompt for preferences when browser storage is unavailable. */ }
    if (hasProfile) return false;
    event?.preventDefault();
    event?.stopPropagation();
    window.dispatchEvent(new Event('fresherjobs:open-profile'));
    return true;
  }

  return <>
    <section className="hero"><div className="container"><div className="eyebrow"><span className="eyedot"/> MADE FOR YOUR FIRST MOVE</div><h1>Your first job<br/>starts here.</h1><p>Find early-career roles and internships from real company career pages across India. Every listing links to its original source.</p>
      <form className="searchbar" onSubmit={(event) => { event.preventDefault(); change('q', draftQuery.trim()); }}><Search size={18} color="#98a1b1" style={{ margin: 'auto 7px' }}/><input name="q" value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Search by role, company, or skill"/><button type="submit">Search jobs <ArrowUpRight size={15} style={{ display: 'inline', verticalAlign: '-3px' }}/></button></form>
      <div className="stats"><div className="stat"><strong>{result.configured ? result.total.toLocaleString('en-IN') : '-'}</strong><span>MATCHING LISTINGS</span></div><div className="stat"><strong>{result.jobs.length ? new Set(result.jobs.map((job) => job.company)).size : '0'}</strong><span>COMPANIES ON PAGE</span></div></div></div></section>
    <main className="main container" id="jobs"><div className="section-head"><div><h2>Roles to get you started</h2><p>Filters update instantly. India-only openings are collected daily; refresh to check for the latest listings.</p></div><button type="button" className="refresh-openings" onClick={refresh} disabled={refreshing}><RefreshCw size={14} className={refreshing ? 'refresh-spinning' : ''}/>{refreshing ? 'Refreshing' : 'Refresh listings'}</button></div>
      <div className="filter-sticky-shell"><div className="filters filters-horizontal" aria-label="Filter job listings" onPointerDownCapture={(event) => { openProfileIfNeeded(event); }} onFocusCapture={() => { openProfileIfNeeded(); }}>{(['city', 'role', 'type', 'experience', 'mode'] as const).map((key) => <label className="filter-card" key={key}><span>{selectMeta[key].label}</span>{key === 'type' ? personalGoal && personalGoal !== 'both' && !forcedType ? <div className="job-type-locked"><select aria-label={`Job type fixed to ${currentType}`} disabled value={currentType}><option>{currentType}</option></select><small>Fixed by your search preference</small></div> : <select aria-label={selectMeta.type.label} value={currentType} onChange={(event) => change('type', event.target.value)}><option value="">{selectMeta.type.placeholder}</option><option value="Full-time">Full-time</option><option value="Internship">Internship</option><option value="Part-time">Part-time</option></select> : <select aria-label={selectMeta[key].label} value={filters[key]} onChange={(event) => change(key, event.target.value)}><option value="">{selectMeta[key].placeholder}</option>{options[key].map((option) => <option key={option} value={option}>{option}</option>)}</select>}</label>)}</div>
        <div className="active-filter-row"><span className="active-filter-caption">{activeFilters.length ? `${activeFilters.length} filters applied` : 'No filters applied'}</span><div className="active-filter-chips">{(['city', 'role', 'type', 'experience', 'mode'] as const).filter((key) => key === 'type' ? Boolean(currentType) : Boolean(filters[key])).map((key) => { const value = key === 'type' ? currentType : filters[key]; return <span className="active-filter-chip" key={key}>{selectMeta[key].label}: {value}{(key !== 'type' || (!forcedType && personalGoal !== 'internship' && personalGoal !== 'job')) && <button type="button" aria-label={`Clear ${selectMeta[key].label} filter`} onClick={() => change(key, '')}><X size={11}/></button>}</span>; })}</div>{activeFilters.some((key) => key !== 'type') && <button type="button" className="clear-filters" onClick={clearFilters}>Clear</button>}</div>
      </div>
      <div className="results-head"><span>{loading ? 'Updating openings...' : `${result.total.toLocaleString('en-IN')} roles found`}</span><span>Newest first</span></div>
      {error && <div className="listing-error" role="alert">{error}<button type="button" onClick={refresh}>Try again</button></div>}
      <div className={`cards ${loading ? 'cards-loading' : ''}`} aria-live="polite" aria-busy={loading}>{!result.configured ? <div className="empty"><BriefcaseBusiness size={26} style={{ margin: '0 auto 12px', color: '#8b9bc2' }}/><strong style={{ display: 'block', color: '#374151', marginBottom: 7 }}>Connect your jobs database</strong>Configure Supabase and approved sources to collect live listings.<div style={{ marginTop: 14 }}><Link href="/setup" style={{ color: '#3159ce' }}>Open setup checklist</Link></div></div> : result.jobs.length ? result.jobs.map((job) => <JobCard key={job.id} job={job}/>) : <div className="empty">No matching India roles yet. Try another filter or check back after the next update.</div>}</div>
      {result.total > 20 && <div className="pagination"><button type="button" disabled={filters.page <= 1} onClick={() => setFilters((old) => ({ ...old, page: old.page - 1 }))}>Previous</button><span>Page {filters.page} of {pageCount}</span><button type="button" disabled={filters.page >= pageCount} onClick={() => setFilters((old) => ({ ...old, page: old.page + 1 }))}>Next</button></div>}
    </main>
  </>;
}
