import {loadEnvConfig} from '@next/env';

async function main(){
 loadEnvConfig(process.cwd());
 const {adminSupabase}=await import('../lib/supabase');
 const {collectAndStore}=await import('./ingest');
 if(!adminSupabase)throw new Error('Set Supabase environment values in .env.local before collecting.');
 const summary=await collectAndStore(adminSupabase);
 console.log(JSON.stringify(summary,null,2));
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
