'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bookmark, BriefcaseBusiness, ChartNoAxesCombined, Compass, Info, Menu, X } from 'lucide-react';
import PersonalDashboard from '@/components/PersonalDashboard';

const items = [
  { href: '/', label: 'Discover jobs', Icon: Compass, match: (path: string) => path === '/' },
  { href: '/saved', label: 'Saved jobs', Icon: Bookmark, match: (path: string) => path === '/saved' },
  { href: '/how-it-works', label: 'How it works', Icon: Info, match: (path: string) => path === '/how-it-works' },
  { href: '/admin', label: 'Data dashboard', Icon: ChartNoAxesCombined, match: (path: string) => path === '/admin' },
];

export default function AppShell({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.removeItem('fresherjobs.resume.v1');
      for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
        const key = sessionStorage.key(index);
        if (key?.startsWith('fresherjobs.match.')) sessionStorage.removeItem(key);
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
  }, []);
  return <div className="app-shell">
    {mobileOpen && <button type="button" className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <Link className="app-brand" href="/" onClick={() => setMobileOpen(false)}><span className="logo-icon">F</span><span>FresherJobs <small>INDIA</small></span></Link>
      <div className="sidebar-caption">JOB SEARCH</div>
      <nav className="app-nav" aria-label="Main navigation">{items.filter((item) => item.href !== '/admin' || isAdmin).map(({ href, label, Icon, match }) => <Link key={href} href={href} className={`app-nav-link ${match(pathname) ? 'active' : ''}`} aria-current={match(pathname) ? 'page' : undefined} onClick={() => setMobileOpen(false)}><Icon size={17}/><span>{label}</span></Link>)}</nav>
      <div className="sidebar-help"><BriefcaseBusiness size={15}/><p>Every listing links to its original employer career page.</p></div>
      <div className="sidebar-profile"><PersonalDashboard/></div>
    </aside>
    <div className="app-main">
      <header className="app-topbar"><button type="button" className="mobile-menu-button" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={20}/> : <Menu size={20}/>}</button><div className="topbar-context">{items.find((item) => item.match(pathname))?.label || 'Job details'}</div><span className="topbar-source">India <i/> Company career listings</span></header>
      <div className="app-content">{children}</div>
    </div>
  </div>;
}
