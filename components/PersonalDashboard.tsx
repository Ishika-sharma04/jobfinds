'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {usePathname,useRouter} from 'next/navigation';
import {BriefcaseBusiness,GraduationCap,UserRound,RefreshCw} from 'lucide-react';

type CareerStage='fresher'|'experienced'|'student';
type Goal='internship'|'job'|'both';
type Profile={name:string;stage:CareerStage;goal:Goal};
const STORAGE_KEY='fresherjobs.profile.v1';
const stageLabels:Record<CareerStage,string>={fresher:'Fresher',experienced:'Experienced professional',student:'College student'};
const goalLabels:Record<Goal,string>={internship:'Internship',job:'Full-time job',both:'Internship or job'};

export default function PersonalDashboard(){
 const router=useRouter();
 const pathname=usePathname();
 const [profile,setProfile]=useState<Profile|null>(null);
 const [form,setForm]=useState<Profile>({name:'',stage:'fresher',goal:'job'});
 const [ready,setReady]=useState(false);
 const [open,setOpen]=useState(false);

 useEffect(()=>{
  try{const value=localStorage.getItem(STORAGE_KEY);if(value){const saved=JSON.parse(value) as Profile;setProfile(saved);setForm(saved);applyGoal(saved.goal,true);}}catch{/* Keep onboarding available from an explicit action if storage is unavailable. */}
  setReady(true);
  const openProfile=()=>setOpen(true);
  window.addEventListener('fresherjobs:open-profile',openProfile);
  return()=>window.removeEventListener('fresherjobs:open-profile',openProfile);
 },[]);

 function applyGoal(goal:Goal,onlyIfMissing=false){document.cookie=`fresherjobs_goal=${goal}; Max-Age=31536000; Path=/; SameSite=Lax${window.location.protocol==='https:'?'; Secure':''}`;if(pathname!=='/')return;const url=new URL(window.location.href);const required=goal==='internship'?'Internship':goal==='job'?'Full-time':null;if(onlyIfMissing&&(!required||url.searchParams.get('type')===required))return;if(required)url.searchParams.set('type',required);else if(!onlyIfMissing)url.searchParams.delete('type');url.searchParams.delete('page');router.replace(`${url.pathname}${url.search}`,{scroll:false});}

 function edit(){setForm(profile||{name:'',stage:'fresher',goal:'job'});setOpen(true);}
 function refreshOpenings(){if(pathname==='/'){window.dispatchEvent(new Event('fresherjobs:refresh-openings'));return;}try{localStorage.setItem('fresherjobs.refresh_pending','1');}catch{/* Navigation still returns to the latest openings. */}router.push('/?refresh=1');}
 function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const clean={...form,name:form.name.trim()};if(clean.name.length<2)return;
  setProfile(clean);setOpen(false);
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(clean));}catch{/* Keep the session profile even if storage is unavailable. */}
  applyGoal(clean.goal);
 }

 return <>
  <section className="profile-dashboard" aria-label="Your job search dashboard">
   <div className="profile-dash-head"><div><span className="dash-kicker">YOUR DASHBOARD</span><h2>{profile?`Hi, ${profile.name}`:'Make this search yours'}</h2></div><span className="profile-avatar"><UserRound size={17}/></span></div>
   {profile?<><p className="profile-summary">Your answers are saved in this browser and used to tune the job list.</p><div className="profile-detail"><GraduationCap size={15}/><span><small>YOUR LEVEL</small><strong>{stageLabels[profile.stage]}</strong></span></div><div className="profile-detail"><BriefcaseBusiness size={15}/><span><small>LOOKING FOR</small><strong>{goalLabels[profile.goal]}</strong></span></div><button type="button" className="sidebar-refresh" onClick={refreshOpenings}><RefreshCw size={13}/> Reload latest openings</button><button type="button" className="profile-edit" onClick={edit}><RefreshCw size={13}/> Edit my answers</button></>:<><p className="profile-summary">Answer three quick questions to personalize your job search.</p><button type="button" className="primary profile-start" onClick={edit}>Set up my dashboard</button><button type="button" className="sidebar-refresh" style={{marginTop:8}} onClick={refreshOpenings}><RefreshCw size={13}/> Reload latest openings</button></>}
  </section>
  {ready&&open&&createPortal(<div className="welcome-backdrop" role="presentation"><section className="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><div className="welcome-icon"><BriefcaseBusiness size={20}/></div><span className="dash-kicker">A QUICK INTRO</span><h2 id="welcome-title">Let&apos;s find your next step.</h2><p className="welcome-description">Three quick answers help us tailor the job list. You can change them any time.</p><form onSubmit={save}>
   <label className="welcome-label" htmlFor="profile-name">What should we call you?</label><input id="profile-name" className="welcome-input" autoComplete="given-name" maxLength={60} minLength={2} required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/>
   <fieldset className="welcome-fieldset"><legend>Which best describes you?</legend><div className="welcome-options">{([['fresher',"I'm a fresher"],['experienced','I have experience'],['student',"I'm a college student"]] as [CareerStage,string][]).map(([value,label])=><label className={`welcome-option ${form.stage===value?'selected':''}`} key={value}><input type="radio" name="stage" value={value} checked={form.stage===value} onChange={()=>setForm({...form,stage:value})}/><span>{label}</span></label>)}</div></fieldset>
   <fieldset className="welcome-fieldset"><legend>What are you looking for?</legend><div className="welcome-options">{([['internship','An internship'],['job','A full-time job'],['both','Either is fine']] as [Goal,string][]).map(([value,label])=><label className={`welcome-option ${form.goal===value?'selected':''}`} key={value}><input type="radio" name="goal" value={value} checked={form.goal===value} onChange={()=>setForm({...form,goal:value})}/><span>{label}</span></label>)}</div></fieldset>
   <button className="primary welcome-submit" type="submit">Show my jobs <span aria-hidden="true">-&gt;</span></button>
  </form><p className="welcome-privacy">Saved only in this browser. No account needed.</p></section></div>,document.body)}
 </>;
}
