import { createClient } from '@supabase/supabase-js';
import { assertSupabaseConfig, env } from '@/config/env';

assertSupabaseConfig();

export const supabase = createClient(
  env.supabaseUrl || 'https://placeholder.supabase.co',
  env.supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
