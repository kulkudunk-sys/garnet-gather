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

  // Присоединиться к серверу по коду приглашения
  joinServerByInvite: async (inviteCode: string) => {
    const response = await makeRequest('/join-by-invite', {
      method: 'POST',
      body: JSON.stringify({ invite_code: inviteCode }),
    });
    return response.member;
  },

  // Создать приглашение на сервер
  createServerInvite: async (serverId: string, options?: { maxUses?: number; expiresAt?: string }) => {
    const response = await makeRequest('/create-invite', {
      method: 'POST',
      body: JSON.stringify({ server_id: serverId, ...options }),
    });
    return response.invite;
  },

  // Получить приглашения сервера
  getServerInvites: async (serverId: string) => {
    const response = await makeRequest(`/invites?server_id=${serverId}`);
    return response.invites || [];
  },

  // Отключить приглашение
  deactivateInvite: async (inviteId: string) => {
    const response = await makeRequest(`/invites/${inviteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: false }),
    });
    return response.invite;
  },

  // Поиск серверов
  searchServers: async (query: string) => {
    const response = await makeRequest('/search-servers', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    return response.servers || [];
  },
};