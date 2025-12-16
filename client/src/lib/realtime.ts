import { supabase } from './supabaseClient';
import { queryClient } from './queryClient';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

let feedChannel: RealtimeChannel | null = null;
let notificationsChannel: RealtimeChannel | null = null;
let commentsChannels: Map<number, RealtimeChannel> = new Map();

export function subscribeToFeed() {
  if (feedChannel) return;

  feedChannel = supabase
    .channel('feed-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'posts',
        filter: 'hidden=eq.false'
      },
      (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
        console.log('Feed change received:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
        queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      }
    )
    .subscribe((status) => {
      console.log('Feed subscription status:', status);
    });
}

export function unsubscribeFromFeed() {
  if (feedChannel) {
    supabase.removeChannel(feedChannel);
    feedChannel = null;
  }
}

export function subscribeToNotifications(userId: string) {
  if (notificationsChannel) return;

  notificationsChannel = supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
      (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
        console.log('New notification received:', payload);
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      }
    )
    .subscribe((status) => {
      console.log('Notifications subscription status:', status);
    });
}

export function unsubscribeFromNotifications() {
  if (notificationsChannel) {
    supabase.removeChannel(notificationsChannel);
    notificationsChannel = null;
  }
}

export function subscribeToComments(postId: number) {
  if (commentsChannels.has(postId)) return;

  const channel = supabase
    .channel(`comments-${postId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `post_id=eq.${postId}`
      },
      (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
        console.log('Comment change received:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['/api/posts', postId, 'comments'] });
      }
    )
    .subscribe((status) => {
      console.log(`Comments subscription for post ${postId}:`, status);
    });

  commentsChannels.set(postId, channel);
}

export function unsubscribeFromComments(postId: number) {
  const channel = commentsChannels.get(postId);
  if (channel) {
    supabase.removeChannel(channel);
    commentsChannels.delete(postId);
  }
}

export function subscribeToPrayerCommitments(prayerRequestId: number) {
  const channelName = `prayer-commitments-${prayerRequestId}`;
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'prayer_commitments',
        filter: `prayer_request_id=eq.${prayerRequestId}`
      },
      (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
        console.log('Prayer commitment change received:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['/api/prayer-requests', prayerRequestId] });
      }
    )
    .subscribe((status) => {
      console.log(`Prayer commitments subscription for request ${prayerRequestId}:`, status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export function cleanupAllSubscriptions() {
  unsubscribeFromFeed();
  unsubscribeFromNotifications();
  commentsChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  commentsChannels.clear();
}
