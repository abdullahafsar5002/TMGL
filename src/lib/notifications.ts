import { supabase } from '@/lib/supabase';
import { toUserFacingServiceError } from '@/lib/errors';
import type { Notification, NotificationType } from '@/types/database';
import type { ServiceResult } from '@/types/service';

const NOTIFICATION_TYPES: NotificationType[] = ['match_update', 'leaderboard_shift', 'achievement', 'system', 'skin_won', 'score_verified', 'tournament', 'registration', 'payment', 'membership'];

export async function getNotifications(profileId: string): Promise<ServiceResult<Notification[]>> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', profileId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load notifications.') };
  return { data: (data ?? []) as Notification[], error: null };
}

export async function getUnreadCount(profileId: string): Promise<ServiceResult<number>> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', profileId)
    .eq('is_read', false);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load notification count.') };
  return { data: count ?? 0, error: null };
}

export async function markAsRead(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to mark the notification as read.') };
  return { data: null, error: null };
}

export async function markAllAsRead(profileId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', profileId)
    .eq('is_read', false);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to mark the notification as read.') };
  return { data: null, error: null };
}

export async function createNotification(notification: { recipient_id: string; type: NotificationType; title: string; message: string; metadata?: Record<string, unknown> }): Promise<ServiceResult<Notification>> {
  if (!NOTIFICATION_TYPES.includes(notification.type)) {
    return { data: null, error: 'Unsupported notification type.' };
  }
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      recipient_id: notification.recipient_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata ?? {},
    })
    .select()
    .single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to create the notification.') };
  return { data: data as Notification, error: null };
}
