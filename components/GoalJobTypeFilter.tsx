'use client';

import {useEffect,useState} from 'react';
type Goal='internship'|'job'|'both';
type Profile={goal:Goal};
const STORAGE_KEY='fresherjobs.profile.v1';

export default function GoalJobTypeFilter({currentType,autoApply=false}:{currentType:string;autoApply?:boolean}){
 const [goal,setGoal]=useState<Goal|null>(null);
 useEffect(()=>{try{const raw=localStorage.getItem(STORAGE_KEY);if(raw){const profile=JSON.parse(raw) as Profile;if(['internship','job','both'].includes(profile.goal))setGoal(profile.goal);}}catch{/* The full job-type selector remains available if local storage cannot be read. */}},[]);
 if(goal==='internship')return <div className="job-type-locked"><select aria-label="Job type is fixed to internship by your profile" disabled value="Internship"><option>Internship</option></select><input type="hidden" name="type" value="Internship"/><small>Fixed by your search preference</small></div>;
 if(goal==='job')return <div className="job-type-locked"><select aria-label="Job type is fixed to full-time by your profile" disabled value="Full-time"><option>Full-time</option></select><input type="hidden" name="type" value="Full-time"/><small>Fixed by your search preference</small></div>;
 return <select name="type" id="type" defaultValue={currentType} onChange={(event)=>{if(autoApply)event.currentTarget.form?.requestSubmit();}}><option value="">Any type</option><option value="Full-time">Full-time</option><option value="Internship">Internship</option><option value="Part-time">Part-time</option></select>;
}
