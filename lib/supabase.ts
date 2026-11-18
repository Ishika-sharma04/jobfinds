import { createClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabase = url&&publishable ? createClient(url,publishable,{auth:{persistSession:false}}) : null;
export const adminSupabase = url&&secret ? createClient(url,secret,{auth:{persistSession:false}}) : null;
