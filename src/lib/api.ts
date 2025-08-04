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
  getServers: async () => {
    const response = await makeRequest('/servers');
    return response.servers || [];
  },
  createServer: async (data: { name: string; description?: string }) => {
    const response = await makeRequest('/servers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.server;
  },

  // Каналы
  getChannels: async (serverId: string) => {
    const response = await makeRequest(`/channels?server_id=${serverId}`);
    return response.channels || [];
  },
  createChannel: async (serverId: string, data: { name: string; type?: 'text' | 'voice' }) => {
    const response = await makeRequest(`/channels?server_id=${serverId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.channel;
  },

  // Сообщения
  getMessages: async (channelId: string, limit = 50) => {
    const response = await makeRequest(`/messages?channel_id=${channelId}&limit=${limit}`);
    return response.messages || [];
  },
  sendMessage: async (channelId: string, content: string) => {
    const response = await makeRequest(`/messages?channel_id=${channelId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return response.message;
  },

  // Присоединиться к серверу
  joinServer: async (serverId: string, inviteCode?: string) => {
    const response = await makeRequest('/join-server', {
      method: 'POST',
      body: JSON.stringify({ server_id: serverId, invite_code: inviteCode }),
    });
    return response.member;
  },
};