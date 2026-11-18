'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Bookmark, MapPin } from 'lucide-react';
import SaveJobButton, { readSavedIds, SAVED_JOBS_EVENT } from '@/components/SaveJobButton';

type SavedJob = { id: string; title: string; company: string; city: string | null; location: string | null; job_type: string | null; experience_level: string | null; work_mode: string | null; source: string; source_url: string; posted_at: string | null; first_seen_at: string; verified_at: string | null };

export default function SavedJobsList() {
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const ids = readSavedIds();
    if (!ids.length) { setJobs([]); setLoading(false); setError(''); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/saved-jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load saved jobs.');
      setJobs(data.jobs || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load saved jobs.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); window.addEventListener(SAVED_JOBS_EVENT, refresh); return () => window.removeEventListener(SAVED_JOBS_EVENT, refresh); }, [refresh]);

  return <main className="saved-page container">
    <div className="saved-title"><div><span className="eyebrow"><span className="eyedot"/> YOUR SHORTLIST</span><h1>Saved jobs</h1><p>Keep interesting roles together in this browser. No account needed.</p></div><Bookmark size={24}/></div>
    {loading ? <div className="saved-loading">Loading your saved roles...</div> : error ? <div className="empty">{error}</div> : jobs.length ? <div className="saved-list">{jobs.map((job) => <article className="saved-card" key={job.id}>
      <Link className="saved-role" href={`/jobs/${job.id}`}><span className="company-mark">{job.company.slice(0, 1).toUpperCase()}</span><span><strong>{job.title}</strong><small>{job.company}</small></span></Link>
      <div className="saved-meta">{(job.city || job.location) && <span><MapPin size={12}/>{job.city || job.location}</span>}{job.job_type && !/^(other|not specified)$/i.test(job.job_type) && <span>{job.job_type}</span>}{job.work_mode && !/^(other|not specified)$/i.test(job.work_mode) && <span>{job.work_mode}</span>}</div>
      <div className="saved-actions"><span className="saved-source">{job.verified_at ? 'Manually verified' : `${job.source} source listing`}</span><SaveJobButton id={job.id}/><a className="card-apply" href={job.source_url} target="_blank" rel="noopener noreferrer">Apply <ArrowUpRight size={14}/></a></div>
    </article>)}</div> : <div className="empty saved-empty"><Bookmark size={25}/><strong>No saved jobs yet</strong><span>Tap the bookmark on any role to keep it here.</span><Link className="primary saved-browse" href="/">Discover jobs</Link></div>}
  </main>;
}
