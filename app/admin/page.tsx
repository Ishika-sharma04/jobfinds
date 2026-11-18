import Link from 'next/link';
import EvaluationTable from '@/components/EvaluationTable';
import {adminSupabase,supabase} from '@/lib/supabase';
import {cookies} from 'next/headers';
import {adminCookieName,isValidAdminSession} from '@/lib/admin-auth';
import AdminLogin from '@/components/AdminLogin';
import AdminLogoutButton from '@/components/AdminLogoutButton';
import AdminCollectionButton from '@/components/AdminCollectionButton';
export const dynamic='force-dynamic';

export default async function Admin(){
 const jar=await cookies();
 if(!isValidAdminSession(jar.get(adminCookieName)?.value))return <AdminLogin configured={Boolean(process.env.ADMIN_SECRET)}/>;
 const counts={jobs:0,newJobs:0,duplicates:0,failed:0,classified:0,verified:0,runCount:0};
 let last:string|null=null,costPerThousand:number|null=null,costedClassifications=0,sample:any[]=[],history:any[]=[],sourceStatus:Record<string,{status:string;items:number;error?:string}>={};
 const accuracy:{role:number|null;city:number|null;experience:number|null;job_type:number|null}={role:null,city:null,experience:null,job_type:null};
 if(supabase){
  const [{count:jobs},{data:run},{data:runs}]=await Promise.all([
   supabase.from('jobs').select('id',{count:'exact',head:true}).eq('status','active'),
   supabase.from('collection_runs').select('*').eq('status','success').order('finished_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('collection_runs').select('*').order('started_at',{ascending:false}).limit(10)
  ]);
  counts.jobs=jobs||0;last=run?.finished_at||null;counts.newJobs=run?.inserted_count||0;counts.duplicates=run?.duplicate_count||0;counts.failed=run?.failed_count||0;counts.classified=run?.classified_count||0;counts.runCount=runs?.length||0;history=runs||[];sourceStatus=run?.source_results||{};
 }
 if(adminSupabase){
  const {count:verified}=await adminSupabase.from('jobs').select('id',{count:'exact',head:true}).not('verified_at','is',null);counts.verified=verified||0;
  const {data:usage}=await adminSupabase.from('ai_usage').select('input_tokens,output_tokens,input_cost_usd,output_cost_usd,classified_count');
  if(usage?.length){const priced=usage.filter(r=>r.input_cost_usd!==null&&r.output_cost_usd!==null);const total=priced.reduce((a,r)=>a+Number(r.input_cost_usd)+Number(r.output_cost_usd),0);costedClassifications=priced.reduce((a,r)=>a+(r.classified_count||0),0);costPerThousand=costedClassifications?total/costedClassifications*1000:null;}
  const {data:evals}=await adminSupabase.from('job_evaluations').select('role_correct,city_correct,experience_correct,job_type_correct');
  if(evals?.length){const keys={role:'role_correct',city:'city_correct',experience:'experience_correct',job_type:'job_type_correct'} as const;for(const k of Object.keys(accuracy) as (keyof typeof accuracy)[]){const field=keys[k];accuracy[k]=evals.reduce((a,r)=>a+(r[field]?1:0),0)/evals.length*100;}}
  const {data:s}=await adminSupabase.rpc('random_unverified_jobs',{sample_size:50});sample=s||[];
 }
 const cards=[['Active listings',counts.jobs],['Added last run',counts.newJobs],['Duplicates skipped',counts.duplicates],['AI classified last run',counts.classified],['Failed listings, AI tags, and sources',counts.failed],['Manually verified',counts.verified],['Recent collection runs',counts.runCount],['Random review sample',sample.length||0]];
 return <><header className="nav"><div className="container"><Link className="logo" href="/"><span className="logo-icon">F</span> fresherjobs<span style={{color:'#4770e6'}}>.in</span></Link></div></header>
 <main className="container" style={{padding:'42px 0 80px'}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}><div><h1 style={{fontSize:32,letterSpacing:'-1px'}}>Data transparency</h1><p style={{color:'#707b8d',fontSize:14}}>Live metrics from Supabase. No sample data is included.</p></div><AdminLogoutButton/></div>
 {!supabase&&<div className="empty" style={{margin:'25px 0'}}><b>Database not configured.</b><br/>Create a Supabase project, apply <code>supabase/migrations/0001_initial.sql</code>, and fill in the values from <code>.env.example</code>.</div>}
 <div className="admin-grid" style={{margin:'25px 0'}}>{cards.map(([label,num])=><div className="admin-stat" key={label}><strong>{supabase?Number(num).toLocaleString('en-IN'):'-'}</strong><span>{label}</span></div>)}</div>
 <h2 style={{fontSize:18,marginTop:38}}>Source and update status</h2><p style={{fontSize:13,color:'#707b8d'}}>Last successful update: {last?new Date(last).toLocaleString('en-IN'):'No successful runs yet'}. Only operator-configured company boards and RSS feeds are queried. The scheduled workflow checks them once each day.</p><AdminCollectionButton/>
 {Object.keys(sourceStatus).length>0?<div className="cards">{Object.entries(sourceStatus).map(([name,s])=><div className="job" key={name} style={{fontSize:12}}><b>{name}</b> · {s.status} · {s.items} listings {s.error?`· ${s.error}`:''}</div>)}</div>:<p style={{fontSize:12,color:'#818a98'}}>No configured source feeds have reported status yet.</p>}
 <h2 style={{fontSize:18,marginTop:34}}>AI classification costs</h2><p style={{fontSize:13,color:'#707b8d'}}>Token counts come from Gemini responses. Cost uses only collection runs where input and output prices were configured, so unpriced runs are excluded.</p><div className="admin-stat" style={{maxWidth:300}}><strong>{costPerThousand===null?'Not available':`$${costPerThousand.toFixed(4)}`}</strong><span>USD per 1,000 priced classifications ({costedClassifications.toLocaleString('en-IN')} total)</span></div>
 <h2 style={{fontSize:18,marginTop:34}}>Manual accuracy evaluation</h2><p style={{fontSize:13,color:'#707b8d'}}>Compare up to 50 randomly selected unreviewed listings with the original company page, then submit the field judgments. Scores reflect saved reviews only.</p><div className="admin-grid">{Object.entries(accuracy).map(([k,v])=><div className="admin-stat" key={k}><strong>{v===null?'-':`${v.toFixed(1)}%`}</strong><span>{k.replace('_',' ')} accuracy</span></div>)}</div>
 {sample.length?<div style={{marginTop:25}}><EvaluationTable items={sample}/></div>:<p style={{fontSize:13,color:'#707b8d',marginTop:16}}>No unreviewed listings are available.</p>}
 <h2 style={{fontSize:18,marginTop:34}}>Collection history</h2>{history.length?<div className="cards">{history.map(r=><div key={r.id} className="job" style={{fontSize:12}}>{new Date(r.started_at).toLocaleString('en-IN')} · {r.status} · {r.inserted_count||0} added · {r.duplicate_count||0} duplicates · {r.failed_count||0} failed</div>)}</div>:<p style={{fontSize:13,color:'#707b8d'}}>No collection history yet.</p>}
 </main></>;
}
