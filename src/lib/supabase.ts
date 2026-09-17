import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

/**
 * Supabase Browser Client Singleton
 * 
 * Uses publishable/anon key only. Never include service-role key.
 */
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
