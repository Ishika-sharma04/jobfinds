'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminCollectionButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function collect() {
    setBusy(true); setMessage('Fetching authorized employer feeds...');
    try {
      const response = await fetch('/api/admin/collect', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not refresh job sources.');
      setMessage(`Refresh complete: ${data.inserted} new, ${data.duplicateCount} already listed, ${data.failed} failed or unclassified.`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not refresh job sources.'); }
    finally { setBusy(false); }
  }

  return <div className="admin-collection-action"><button type="button" className="refresh-openings" onClick={collect} disabled={busy}><RefreshCw size={14} className={busy ? 'refresh-spinning' : ''}/>{busy ? 'Updating sources...' : 'Collect openings now'}</button><span role="status" aria-live="polite">{message}</span></div>;
}
