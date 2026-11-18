import type { Metadata } from 'next';
import './globals.css';
import './setup.css';
import './experience.css';
import AppShell from '@/components/AppShell';
import { cookies } from 'next/headers';
import { adminCookieName, isValidAdminSession } from '@/lib/admin-auth';
export const metadata: Metadata = { title: 'FresherJobs India — Early career jobs, clearly sourced', description: 'Discover fresher jobs and internships from company career pages across India.' };
export default async function RootLayout({children}:{children:React.ReactNode}) { const jar=await cookies(); const isAdmin=isValidAdminSession(jar.get(adminCookieName)?.value); return <html lang="en"><body><AppShell isAdmin={isAdmin}>{children}</AppShell></body></html>; }
