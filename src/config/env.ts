/**
 * Safe Environment Variable Accessor
 * 
 * Rules:
 * 1. Never expose Supabase service-role keys.
 * 2. Only browser-safe variables prefixed with VITE_ are accessed here.
 * 3. Graceful warnings when keys are missing, preventing unhandled crashes during initial setup.
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
  aiCaddieEnabled: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const aiCaddieEnabled = import.meta.env.VITE_AI_CADDIE_ENABLED === 'true';

const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-publishable-key'
);

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    '[TMGL Environment Warning]: Supabase credentials are not configured or using default placeholders. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env or .env.local file.'
  );
}

export const env: EnvConfig = {
  supabaseUrl,
  supabaseAnonKey,
  isConfigured,
  aiCaddieEnabled
};
