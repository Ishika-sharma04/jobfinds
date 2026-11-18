import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import SaveJobButton from '@/components/SaveJobButton';

function visible(value: string | null | undefined) {
  const clean = value?.trim();
  return clean && !/^(not specified|other)$/i.test(clean) ? clean : null;
}

function cleanDescription(value: string | null) {
  return (value || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabase) notFound();
  const { data: job } = await supabase.from('jobs').select('*').eq('id', id).eq('status', 'active').maybeSingle();
  if (!job) notFound();

  const description = cleanDescription(job.description);
  const tags = [job.job_type, job.experience_level, job.work_mode, job.category, ...(job.skills || [])]
    .map(visible)
    .filter((value): value is string => Boolean(value));
  const place = visible(job.city) || visible(job.location);
  const experience = visible(job.experience_level) || 'Classification pending';
  const type = visible(job.job_type) || 'Classification pending';
  const mode = visible(job.work_mode) || 'Classification pending';

  return <>
    <header className="nav"><div className="container nav-inner">
      <Link className="logo" href="/"><span className="logo-icon">F</span> fresherjobs<span style={{ color: '#4770e6' }}>.in</span></Link>
      <nav className="navlinks"><Link href="/">Find jobs</Link><Link href="/how-it-works">How it works</Link></nav>
    </div></header>
    <main className="detail-page container">
      <Link href="/" className="back-link"><ArrowLeft size={14}/> Back to job search</Link>
      <section className="detail-hero">
        <div className="detail-company-mark">{job.company.slice(0, 1).toUpperCase()}</div>
        <div className="detail-heading">
          <div className="dash-kicker">{job.company} - COMPANY CAREERS</div>
          <h1>{job.title}</h1>
          <p className="detail-location"><MapPin size={15}/>{place || 'Location details on employer site'}</p>
        </div>
        <div className="detail-hero-actions"><SaveJobButton id={job.id}/></div>
      </section>
      <div className="detail-layout">
        <article className="detail-content">
          {tags.length > 0 && <div className="detail-tags">{tags.map((tag) => <span className="tag blue" key={tag}>{tag}</span>)}</div>}
          <h2>About the role</h2>
          {description ? <p className="detail-description">{description}</p> : <p className="detail-muted">The employer has not provided a description on this listing.</p>}
          {visible(job.requirements) && <><h2>What the employer asks for</h2><ul className="detail-requirements">{job.requirements.split('\n').filter(Boolean).map((item: string, index: number) => <li key={index}>{item}</li>)}</ul></>}
          <div className="detail-source-note"><BriefcaseBusiness size={16}/><span>Applications go directly to {job.company}&apos;s career site. Check the original posting for the latest details.</span></div>
        </article>
        <aside className="detail-facts">
          <h2>Role details</h2>
          <dl>
            <div><dt>Job type</dt><dd>{type}</dd></div>
            <div><dt>Experience</dt><dd>{experience}</dd></div>
            <div><dt>Work mode</dt><dd>{mode}</dd></div>
            <div><dt>Location</dt><dd>{place || 'Details on employer site'}</dd></div>
            <div><dt>Listed</dt><dd>{new Date(job.first_seen_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
            <div><dt>Career platform</dt><dd>{job.source}</dd></div>
            <div><dt>Review status</dt><dd>{job.verified_at ? 'Manually verified' : 'Employer listing; independent review pending'}</dd></div>
          </dl>
          <a className="detail-apply detail-apply-wide" href={job.source_url} target="_blank" rel="noopener noreferrer">View original posting <ArrowUpRight size={15}/></a>
        </aside>
      </div>
    </main>
  </>;
}
