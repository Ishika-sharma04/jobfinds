'use client';

const placeholders: Record<string, string> = { city: 'All locations', role: 'All roles', experience: 'Any experience', mode: 'Any work mode' };

export default function AutoApplySelect({ name, label, value, options }: { name: string; label: string; value: string; options: readonly string[] }) {
  return <label className="filter-card"><span>{label}</span><select name={name} id={name} defaultValue={value} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
    <option value="">{placeholders[name]}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}
  </select></label>;
}
