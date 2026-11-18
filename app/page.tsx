import Link from 'next/link';
import { cookies } from 'next/headers';
import { searchJobs } from '@/lib/jobs';
import JobBrowser from '@/components/JobBrowser';

const options = {
  city: ['Bengaluru', 'Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Delhi NCR', 'Noida', 'Gurugram', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Kochi', 'Thiruvananthapuram', 'Lucknow', 'Indore', 'Chandigarh', 'Remote'],
  role: ['Engineering', 'Data', 'Design', 'Finance', 'Product', 'Sales', 'Marketing', 'Operations', 'Human Resources', 'Customer Support'],
  experience: ['Internship', 'Entry level', '0 to 1 years', '1 to 2 years'],
  mode: ['Remote', 'Hybrid', 'On-site'],
} as const;

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const page = Math.max(1, Number(value('page')) || 1);
  const savedGoal = (await cookies()).get('fresherjobs_goal')?.value;
  const forcedType = savedGoal === 'internship' ? 'Internship' : savedGoal === 'job' ? 'Full-time' : undefined;
  const filters = { q: value('q'), city: value('city'), role: value('role'), type: forcedType || value('type'), experience: value('experience'), mode: value('mode'), page };
  const initial = await searchJobs({ ...filters, includeLastUpdated: true });
  const pages = Math.max(1, Math.ceil(initial.total / 20));
  return <><JobBrowser initial={initial} filters={filters} pages={pages} forcedType={forcedType} options={options}/><footer className="footer"><div className="container footer-inner"><span>Copyright 2026 FresherJobs India | Independent early-career discovery</span><span>Listings link to original company career pages. Confirm current availability with the employer.</span><Link href="/how-it-works">How it works</Link></div></footer></>;
}
