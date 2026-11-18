'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';

const key = 'fresherjobs.saved.v1';
const changed = 'fresherjobs:saved-changed';

export function readSavedIds() {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []; }
  catch { return []; }
}

export default function SaveJobButton({ id }: { id: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(readSavedIds().includes(id)); }, [id]);
  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault(); event.stopPropagation();
    const ids = readSavedIds();
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [id, ...ids].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(next)); setSaved(next.includes(id));
    window.dispatchEvent(new CustomEvent(changed));
  }
  return <button type="button" className={`save-job-button ${saved ? 'is-saved' : ''}`} onClick={toggle} aria-label={saved ? 'Remove from saved jobs' : 'Save this job'} aria-pressed={saved} title={saved ? 'Saved' : 'Save job'}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'}/></button>;
}

export const SAVED_JOBS_EVENT = changed;
