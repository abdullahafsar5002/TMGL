import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { useToast } from '@/context/ToastContext';
import { getNotifications, markAsRead, markAllAsRead } from '@/lib/notifications';
import type { Notification } from '@/types/database';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadData = useCallback(async (options?: { background?: boolean }) => {
    if (!user) return;
    const profileId = profile?.id ?? user.id;
    const background = options?.background ?? false;
    if (!background) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await getNotifications(profileId);
      if (!mountedRef.current) return;
      if (result.error) setError(result.error);
      else setNotifications(result.data ?? []);
    } catch {
      if (mountedRef.current) setError('Failed to load notifications.');
    } finally {
      if (!background && mountedRef.current) setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => { void loadData(); }, [loadData]);

  // The header badge refetches on navigation and via realtime; keep the list in
  // step when the tab regains focus so a reload is never needed.
  useEffect(() => {
    const refresh = () => { void loadData({ background: true }); };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadData]);

  async function handleMarkAsRead(id: string) {
    const result = await markAsRead(id);
    if (result.error) {
      setError(result.error);
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  }

  async function handleMarkAllAsRead() {
    if (!user) return;
    const result = await markAllAsRead(profile?.id ?? user.id);
    if (result.error) {
      setError(result.error);
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read.');
    }
  }

  if (loading) return <LoadingState message="Loading notifications..." />;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Container className="py-8 max-w-3xl">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : 'All caught up.'
        }
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="mr-1 h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You're all caught up! Notifications about matches, invitations, and announcements will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={!notification.is_read ? 'border-tmgl-green-300 bg-tmgl-green-50/40' : ''}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-2 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-tmgl-charcoal-300' : 'bg-tmgl-green-600'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`font-display text-sm font-semibold ${notification.is_read ? 'text-tmgl-charcoal-600' : 'text-tmgl-charcoal-950'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="rounded-pill bg-tmgl-green-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-tmgl-green-700">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-tmgl-charcoal-600">{notification.message}</p>
                    <p className="mt-2 text-xs text-tmgl-charcoal-400">{timeAgo(notification.created_at)}</p>
                  </div>
                  {!notification.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(notification.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
