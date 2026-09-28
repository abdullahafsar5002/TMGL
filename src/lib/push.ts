import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';

const FCM_TOKEN_STORAGE_KEY = 'tmgl-fcm-token';
const FIREBASE_CONFIGURED = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
  import.meta.env.VITE_FIREBASE_APP_ID
);

export interface DeviceRegistration {
  profile_id: string;
  fcm_token: string;
  platform: 'web' | 'android' | 'ios';
}

function isBrowser(): boolean {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

export function isFcmConfigured(): boolean {
  return FIREBASE_CONFIGURED;
}

export function saveFcmToken(token: string): void {
  try {
    if (isBrowser() && token.trim()) localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token.trim());
  } catch {
    return;
  }
}

export function getSavedFcmToken(): string | null {
  try {
    if (!isBrowser()) return null;
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function isPushSupported(platform: DeviceRegistration['platform']): boolean {
  if (platform !== 'web') return true;
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export async function registerFcmToken(
  profileId: string,
  token: string | null = getSavedFcmToken(),
  platform: DeviceRegistration['platform'] = 'web'
): Promise<{ registered: boolean; error: string | null }> {
  if (!profileId || !token?.trim() || !isFcmConfigured() || !isPushSupported(platform)) return { registered: false, error: null };
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user || authData.user.id !== profileId) return { registered: false, error: null };
    const { error } = await supabase.from('player_devices').upsert({
      profile_id: profileId,
      fcm_token: token.trim(),
      platform,
    }, { onConflict: 'profile_id,platform' });
    return { registered: !error, error: error ? getErrorMessage(error, 'Unable to register this device.') : null };
  } catch (error) {
    return { registered: false, error: getErrorMessage(error, 'Unable to register this device.') };
  }
}
