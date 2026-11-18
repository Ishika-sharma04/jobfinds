import {NextRequest,NextResponse} from 'next/server';
import {adminSupabase} from '@/lib/supabase';
import {collectAndStore} from '@/server/ingest';
export const maxDuration=300;

export async function POST(request:NextRequest){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!adminSupabase)return NextResponse.json({error:'Supabase is not configured'},{status:503});
 try{return NextResponse.json(await collectAndStore(adminSupabase));}
 catch(error){console.error('Scheduled collection failed:',error instanceof Error?error.message:error);return NextResponse.json({error:'Collection failed. Check the collection run log.'},{status:500});}
}
