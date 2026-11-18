import Link from 'next/link';
import { ArrowDown, ArrowRight, BriefcaseBusiness, CheckCircle2, Compass, FileSearch, ShieldCheck, Sparkles } from 'lucide-react';

const steps = [
  { number: '01', icon: Compass, title: 'Tell us where you are headed', text: 'Share your name, career stage, and whether you want an internship, a full-time job, or either. Your answers stay in this browser and can be edited any time.' },
  { number: '02', icon: FileSearch, title: 'Explore a focused job list', text: 'Search by role, company, skill, city, experience, job type, and work mode. Use filters to narrow the list and pagination to browse more.' },
  { number: '03', icon: ShieldCheck, title: 'Check the original posting', text: "Each listing shows its public source and links to the company's original job page. Confirm the current details and eligibility there before applying." },
  { number: '04', icon: BriefcaseBusiness, title: 'Apply directly with the employer', text: "FresherJobs India helps you discover roles. Applications go to the employer's own career site, where you can review the role and submit your details." },
];

export default function HowItWorks() {
  return <>
    <header className="nav"><div className="container nav-inner"><Link className="logo" href="/"><span className="logo-icon">F</span> fresherjobs<span style={{ color: '#4770e6' }}>.in</span></Link><nav className="navlinks"><Link href="/">Find jobs</Link><Link href="/setup">Setup checklist</Link></nav></div></header>
    <main className="how-page">
      <section className="how-hero container"><div className="how-hero-copy"><span className="eyebrow"><span className="eyedot"/> A CLEARER WAY TO GET STARTED</span><h1>From &ldquo;what&rsquo;s next?&rdquo;<br/>to <span className="how-highlight">your next step.</span></h1><p>Know how listings are collected, how to find a role that fits, and where your application goes.</p><Link className="primary how-cta" href="/">Explore open roles <ArrowRight size={15}/></Link></div><div className="how-visual" aria-label="Job search journey illustration"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="how-visual-center"><Sparkles size={27}/></div><div className="float-card float-card-one"><span className="float-icon"><Compass size={15}/></span><span><b>Find your direction</b><small>Personalized search</small></span></div><div className="float-card float-card-two"><span className="float-icon green"><CheckCircle2 size={15}/></span><span><b>Source linked</b><small>Original job page</small></span></div><span className="how-spark spark-one">*</span><span className="how-spark spark-two">*</span></div></section>
      <section className="how-steps container"><div className="how-section-title"><span className="dash-kicker">FOUR SIMPLE STEPS</span><h2>A little clarity goes a long way.</h2><p>Your search stays straightforward from the first visit to the employer&rsquo;s application page.</p></div><div className="step-list">{steps.map((step, index) => { const Icon = step.icon; return <article className="how-step" style={{ animationDelay: `${index * 110}ms` }} key={step.number}><div className="step-index">{step.number}</div><div className="step-icon"><Icon size={19}/></div><div className="step-copy"><h3>{step.title}</h3><p>{step.text}</p></div>{index < steps.length - 1 && <ArrowDown className="step-arrow" size={17}/>}</article>; })}</div></section>
      <section className="how-trust"><div className="container trust-inner"><div><span className="dash-kicker">BUILT FOR TRANSPARENCY</span><h2>Real listings. Clear sources.</h2><p>Only configured public company feeds and permitted RSS sources are collected. Listings link back to the employer source; details that have not been confirmed are marked clearly.</p></div><Link href="/" className="trust-link">Browse current roles <ArrowRight size={15}/></Link></div></section>
      <section className="how-bottom container"><h2>Ready to see what&rsquo;s out there?</h2><p>Choose your next step and browse listings from the source.</p><Link className="primary how-cta" href="/">Find jobs <ArrowRight size={15}/></Link></section>
    </main>
    <footer className="footer"><div className="container footer-inner"><span>Copyright 2026 FresherJobs India</span><Link href="/">Find jobs</Link><Link href="/setup">Setup checklist</Link></div></footer>
  </>;
}
