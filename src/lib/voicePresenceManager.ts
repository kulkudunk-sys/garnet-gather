import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Глобальный presence канал для голосовых пользователей
let globalVoicePresenceChannel: RealtimeChannel | null = null;

export const getVoicePresenceChannel = async () => {
  if (!globalVoicePresenceChannel) {
    console.log('Creating GLOBAL voice presence channel...');
    globalVoicePresenceChannel = supabase.channel('global_voice_presence_singleton');
    await globalVoicePresenceChannel.subscribe();
    console.log('Global voice presence channel created and subscribed!');
  }
  return globalVoicePresenceChannel;
};

export const trackVoiceUser = async (userData: any) => {
  const channel = await getVoicePresenceChannel();
  console.log('=== TRACKING VOICE USER ===');
  console.log('User data:', userData);
  await channel.track(userData);
};

export const untrackVoiceUser = async () => {
  if (globalVoicePresenceChannel) {
    console.log('Untracking voice user...');
    await globalVoicePresenceChannel.untrack();
  }
};