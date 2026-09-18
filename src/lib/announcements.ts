import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types/database';
import type { ServiceResult } from '@/types/service';

export async function getPublishedAnnouncements(): Promise<ServiceResult<Announcement[]>> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Announcement[], error: null };
}

export async function getAllAnnouncements(): Promise<ServiceResult<Announcement[]>> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Announcement[], error: null };
}

export async function getAnnouncement(id: string): Promise<ServiceResult<Announcement>> {
  const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as Announcement, error: null };
}

export async function createAnnouncement(announcement: { author_id: string; title: string; content: string; is_published?: boolean }): Promise<ServiceResult<Announcement>> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      author_id: announcement.author_id,
      title: announcement.title,
      content: announcement.content,
      is_published: announcement.is_published ?? false,
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as Announcement, error: null };
}

export async function updateAnnouncement(id: string, updates: Partial<Pick<Announcement, 'title' | 'content' | 'is_published'>>): Promise<ServiceResult<Announcement>> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) payload[k] = v;
  }
  const { data, error } = await supabase.from('announcements').update(payload).eq('id', id).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as Announcement, error: null };
}

export async function deleteAnnouncement(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}
