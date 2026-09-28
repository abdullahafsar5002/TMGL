export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConfigured: boolean;
  configurationError: string | null;
  galleryStorageBucket: string;
  firebaseConfigured: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
const galleryStorageBucket = import.meta.env.VITE_GALLERY_STORAGE_BUCKET?.trim() || 'gallery-images';

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const missing: string[] = [];
if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
if (supabaseUrl && !isValidUrl(supabaseUrl)) missing.push('VITE_SUPABASE_URL (must be a valid URL)');
if (supabaseAnonKey === 'your-anon-publishable-key') missing.push('VITE_SUPABASE_ANON_KEY (placeholder value)');
if (supabaseAnonKey.startsWith('sb_secret_')) missing.push('VITE_SUPABASE_ANON_KEY (service-role keys are not allowed in the browser)');

const configurationError = missing.length > 0
  ? `Missing or invalid public Supabase configuration: ${missing.join(', ')}.`
  : null;

const firebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

export function assertSupabaseConfig(): void {
  if (import.meta.env.DEV && configurationError) {
    throw new Error(configurationError);
  }
}

export const env: EnvConfig = {
  supabaseUrl,
  supabaseAnonKey,
  isConfigured: configurationError === null,
  configurationError,
  galleryStorageBucket,
  firebaseConfigured,
};
