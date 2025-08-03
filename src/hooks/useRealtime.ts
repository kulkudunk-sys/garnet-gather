import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export function useRealtimeMessages(channelId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    // Создаем канал для реального времени
    const realtimeChannel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Получаем профиль пользователя для нового сообщения
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          const newMessage: Message = {
            ...payload.new as any,
            profiles: profile || {
              username: 'Unknown',
              display_name: null,
              avatar_url: null
            }
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [channelId]);

  return { messages, setMessages, channel };
}

export function useRealtimePresence(roomId: string) {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const presenceChannel = supabase.channel(`presence:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const users = Object.values(newState).flat();
        setOnlineUsers(users as any[]);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const userStatus = {
              user_id: user.id,
              email: user.email,
              online_at: new Date().toISOString(),
            };
            await presenceChannel.track(userStatus);
          }
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [roomId]);

  return { onlineUsers, channel };
}