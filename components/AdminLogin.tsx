'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not sign in.');
      setSecret('');
      // A full request makes the server read the newly set HttpOnly session cookie.
      window.location.replace('/admin');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }
  return <main className="container admin-gate"><span className="admin-gate-icon"><LockKeyhole size={20}/></span><span className="dash-kicker">ADMIN ONLY</span><h1>Data transparency dashboard</h1><p>Sign in with the admin secret configured on the server. This dashboard is private.</p>
    {configured ? <form onSubmit={submit} className="admin-login-form"><label htmlFor="admin-secret">Admin secret</label><input id="admin-secret" type="password" autoComplete="current-password" value={secret} onChange={(event) => setSecret(event.target.value)} required/><button className="primary" disabled={busy}>{busy ? 'Checking...' : 'Open dashboard'}</button>{error && <small role="alert">{error}</small>}</form> : <div className="admin-config-note">Add <code>ADMIN_SECRET</code> to the server environment, then restart the app. Keep it private.</div>}
  </main>;
}
