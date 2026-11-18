import { supabase } from './supabase';
import type { JobSummary } from './types';

const LIST_COLUMNS = 'id,title,company,location,city,state,category,experience_level,job_type,work_mode,skills,source,source_url,posted_at,first_seen_at,is_fresher,verified_at,status';
const ROLE_TITLE_TERMS:Record<string,string[]>={
 Engineering:['engineer','engineering','software','developer','devops','sdet','backend','frontend','full-stack','QA'],
 Data:['data','analytics','analyst','scientist','machine learning','business intelligence'],
 Design:['design','designer','UX','visual designer'],
 Finance:['finance','financial','accounting','accountant','accounts','treasury','audit','tax','investment'],
 Product:['product manager','product owner','product'],
 Sales:['sales','account executive','business development'],
 Marketing:['marketing','growth','brand'],
 Operations:['operations','program manager','project manager'],
 'Human Resources':['human resources','recruiter','talent acquisition'],
 'Customer Support':['customer support','customer success','support specialist'],
};

export async function searchJobs(p:{q?:string;city?:string;role?:string;type?:string;experience?:string;mode?:string;page?:number;limit?:number;includeLastUpdated?:boolean}={}) {
 if(!supabase)return {jobs:[] as JobSummary[],total:0,lastUpdated:null as string|null,configured:false};
 let query=supabase.from('jobs').select(LIST_COLUMNS,{count:'exact'}).eq('status','active').order('posted_at',{ascending:false,nullsFirst:false}).order('first_seen_at',{ascending:false});
 const groups:string[]=[];
 if(p.q){const safe=p.q.replace(/[^a-zA-Z0-9\s&-]/g,' ').replace(/\s+/g,' ').trim().slice(0,80);const skill=safe.split(' ')[0]?.replace(/[^a-zA-Z0-9_-]/g,'');if(safe)groups.push(`or(title.ilike.%${safe}%,company.ilike.%${safe}%${skill?`,skills.cs.{${skill}}`:''})`);}
 if(p.city){const city=p.city.replace(/[^a-zA-Z0-9\s&-]/g,' ').replace(/\s+/g,' ').trim().slice(0,60);if(city)groups.push(`or(city.ilike.%${city}%,location.ilike.%${city}%)`);}
 if(p.role){const role=cleanRole(p.role);const terms=ROLE_TITLE_TERMS[role]||[role];const conditions=[`category.ilike.%${role}%`,...terms.map((term)=>`title.ilike.%${term}%`)];groups.push(`or(${conditions.join(',')})`);}
 if(groups.length)query=query.or(`and(${groups.join(',')})`);
 const clean=(value:string)=>value.replace(/[^a-zA-Z0-9\s&-]/g,'').slice(0,60);
 if(p.type)query=query.eq('job_type',clean(p.type)); if(p.experience)query=query.eq('experience_level',clean(p.experience)); if(p.mode)query=query.eq('work_mode',clean(p.mode));
 const page=Math.max(1,p.page||1), limit=Math.min(50,p.limit||20); query=query.range((page-1)*limit,page*limit-1);
 const {data,count,error}=await query; if(error){console.error('Job search failed:',error.message);return {jobs:[] as JobSummary[],total:0,lastUpdated:null as string|null,configured:false};}
 let lastUpdated:string|null=null;
 if(p.includeLastUpdated){const {data:stamp}=await supabase.from('collection_runs').select('finished_at').eq('status','success').order('finished_at',{ascending:false}).limit(1).maybeSingle();lastUpdated=stamp?.finished_at||null;}
 return {jobs:(data||[]) as JobSummary[],total:count||0,lastUpdated,configured:true};
}

function cleanRole(value:string){return value.replace(/[^a-zA-Z\s]/g,'').replace(/\s+/g,' ').trim().slice(0,50);}
