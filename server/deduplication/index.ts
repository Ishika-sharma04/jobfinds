import type {RawJob} from '../collectors/types';

export function normalizeUrl(value:string){
 try{
  const url=new URL(value);url.hash='';
  for(const key of [...url.searchParams.keys()])if(/^utm_/i.test(key)||/^(source|ref|gh_src|lever-source)$/i.test(key))url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString().replace(/\/$/,'');
 }catch{return value.trim();}
}
export function key(job:RawJob){return normalizeUrl(job.url);}
function text(value:string){return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function words(value:string){return new Set(text(value).split(' ').filter(w=>w.length>2));}
function similarity(a:string,b:string){const A=words(a),B=words(b);if(!A.size||!B.size)return 0;let overlap=0;for(const token of A)if(B.has(token))overlap++;return overlap/(A.size+B.size-overlap);}
export function deduplicate(jobs:RawJob[]){
 const seenUrls=new Set<string>(),seenRoles=new Set<string>(),descriptions:Array<{company:string;title:string;location:string;description:string}>=[];
 return jobs.filter(job=>{
  let url:URL;try{url=new URL(job.url);if(url.protocol!=='https:')return false;}catch{return false;}
  const canonical=normalizeUrl(job.url);if(!canonical||seenUrls.has(canonical))return false;
  const company=text(job.company),title=text(job.title),location=text(job.location||'');
  if(!company||!title)return false;
  const roleKey=`${company}|${title}|${location}`;if(seenRoles.has(roleKey))return false;
  const description=text(job.description||'');
  if(description.split(' ').length>=20&&descriptions.some(prev=>prev.company===company&&prev.location===location&&similarity(prev.title,title)>=0.8&&similarity(prev.description,description)>=0.9))return false;
  seenUrls.add(canonical);seenRoles.add(roleKey);
  if(description)descriptions.push({company,title,location,description});
  return true;
 });
}
