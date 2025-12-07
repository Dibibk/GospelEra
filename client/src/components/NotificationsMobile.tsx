import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabaseClient';

interface Notification {
  id: number;
  recipient_id: string;
  actor_id: string | null;
  event_type: string;
  post_id: number | null;
  comment_id: number | null;
  prayer_request_id: number | null;
  commitment_id: number | null;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface NotificationsMobileProps {
  onBack: () => void;
  onNotificationClick?: (notification: Notification) => void;
  onCountChange?: (count: number) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return `${Math.floor(diffInSeconds / 604800)}w`;
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case 'comment':
      return '💬';
    case 'amen':
      return '🙏';
    case 'prayer_commitment':
      return '🤝';
    case 'prayer_prayed':
      return '✨';
    case 'prayer_update':
      return '📢';
    default:
      return '🔔';
  }
}

export function NotificationsMobile({ onBack, onNotificationClick, onCountChange }: NotificationsMobileProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const getApiBaseUrl = useCallback(() => {
    return Capacitor.isNativePlatform() ? 'https://gospel-era.replit.app' : '';
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/notifications?limit=50`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        onCountChange?.(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [getApiBaseUrl, onCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      setNotifications(prev => {
        const updated = prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        );
        // Calculate unread count from the updated list
        const newUnreadCount = updated.filter(n => !n.is_read).length;
        onCountChange?.(newUnreadCount);
        return updated;
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      onCountChange?.(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingBottom: '16px',
          minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid #dbdbdb',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            data-testid="button-back-notifications"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
            }}
          >
            ←
          </button>
          <span style={{ fontSize: '18px', fontWeight: 600, color: '#262626' }}>
            Notifications
          </span>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAllRead}
            data-testid="button-mark-all-read"
            style={{
              background: 'none',
              border: 'none',
              color: '#4285f4',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px',
              opacity: markingAllRead ? 0.5 : 1,
            }}
          >
            {markingAllRead ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      <div style={{ padding: '0' }}>
        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔔</div>
            <div style={{ color: '#8e8e8e' }}>Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#262626' }}>
              No notifications yet
            </div>
            <div style={{ color: '#8e8e8e', fontSize: '14px' }}>
              When someone comments on your posts or prays for you, you'll see it here.
            </div>
          </div>
        ) : (
          <div>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                data-testid={`notification-item-${notification.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  width: '100%',
                  textAlign: 'left',
                  background: notification.is_read ? '#ffffff' : '#f0f7ff',
                  border: 'none',
                  borderBottom: '1px solid #efefef',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: notification.actor?.avatar_url ? 'none' : '#e8e8e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {notification.actor?.avatar_url ? (
                    <img
                      src={notification.actor.avatar_url}
                      alt=""
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '20px' }}>{getEventIcon(notification.event_type)}</span>
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#262626',
                      lineHeight: 1.4,
                      marginBottom: '4px',
                    }}
                  >
                    {notification.message}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8e8e8e' }}>
                    {formatTimeAgo(notification.created_at)}
                  </div>
                </div>
                
                {!notification.is_read && (
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4285f4',
                      flexShrink: 0,
                      marginTop: '6px',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
