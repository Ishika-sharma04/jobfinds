'use client';

import { useState } from 'react';

type Item = { id: string; title: string; company: string; city: string | null; category: string | null; experience_level: string | null; job_type: string | null; source_url: string };
const fields = ['role_correct', 'city_correct', 'experience_correct', 'job_type_correct'] as const;
const labels = ['Role accurate', 'City accurate', 'Experience accurate', 'Job type accurate'];

export default function EvaluationTable({ items }: { items: Item[] }) {
  const [state, setState] = useState<Record<string, string>>({});
  async function save(id: string, form: HTMLFormElement) {
    const values = new FormData(form);
    const payload: Record<string, unknown> = { job_id: id, reviewer: 'admin' };
    for (const field of fields) payload[field] = values.get(field) === 'yes';
    const button = form.querySelector('button');
    if (button) { button.textContent = 'Saving...'; button.disabled = true; }
    try {
      const response = await fetch('/api/evaluate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      setState((current) => ({ ...current, [id]: response.ok ? 'Review saved' : 'Could not save review' }));
    } catch { setState((current) => ({ ...current, [id]: 'Network error' })); }
    finally { if (button) { button.textContent = 'Save review'; button.disabled = false; } }
  }
  return <div className="evaluation-list">{items.map((job) => <form key={job.id} onSubmit={(event) => { event.preventDefault(); void save(job.id, event.currentTarget); }} className="job">
    <div style={{ fontWeight: 700 }}>{job.title}</div><div className="company">{job.company} · AI tags: {job.category || 'role unknown'}, {job.city || 'city unknown'}, {job.experience_level || 'experience unknown'}, {job.job_type || 'type unknown'} · <a href={job.source_url} target="_blank" rel="noreferrer" style={{ color: '#3159ce' }}>Check employer source ↗</a></div>
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12 }}>{fields.map((field, index) => <label key={field} style={{ fontSize: 11, color: '#566171' }}>{labels[index]}<select name={field} defaultValue="yes" style={{ display: 'block', padding: 6, border: '1px solid #ddd', borderRadius: 5, marginTop: 4 }}><option value="yes">Yes</option><option value="no">No</option></select></label>)}<button type="submit" className="primary" style={{ padding: '8px 12px', fontSize: 11 }}>Save review</button><span style={{ fontSize: 11, alignSelf: 'center' }}>{state[job.id]}</span></div>
  </form>)}</div>;
}
