import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = `https://wlbgfqyfcxsoveflmxsi.supabase.co/functions/v1/discord-api`;

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(session && { 'Authorization': `Bearer ${session.access_token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export const api = {
  // Серверы
  getServers: () => makeRequest('/servers'),
  createServer: (data: { name: string; description?: string }) =>
    makeRequest('/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Каналы
  getChannels: (serverId: string) =>
    makeRequest(`/channels?server_id=${serverId}`),
  createChannel: (serverId: string, data: { name: string; type?: 'text' | 'voice' }) =>
    makeRequest(`/channels?server_id=${serverId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Сообщения
  getMessages: (channelId: string, limit = 50) =>
    makeRequest(`/messages?channel_id=${channelId}&limit=${limit}`),
  sendMessage: (channelId: string, content: string) =>
    makeRequest(`/messages?channel_id=${channelId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Присоединиться к серверу
  joinServer: (serverId: string, inviteCode?: string) =>
    makeRequest('/join-server', {
      method: 'POST',
      body: JSON.stringify({ server_id: serverId, invite_code: inviteCode }),
    }),
};