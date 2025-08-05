import { Hash, Volume2, Settings, ChevronDown, Plus, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimePresence } from "@/hooks/useRealtime";

interface ChannelSidebarProps {
  serverId: string;
  serverName: string;
  activeChannel: string;
  onChannelChange: (channelId: string) => void;
}

export const ChannelSidebar = ({ serverId, serverName, activeChannel, onChannelChange }: ChannelSidebarProps) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { onlineUsers: voiceChannelUsers } = useRealtimePresence('global_voice_presence_singleton');

  useEffect(() => {
    const loadChannels = async () => {
      if (!serverId) return;
      
      try {
        const channelsData = await api.getChannels(serverId);
        setChannels(channelsData);
      } catch (error) {
        console.error("Ошибка загрузки каналов:", error);
        setChannels([]);
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, [serverId]);

  // Функция для получения пользователей в определенном голосовом канале
  const getUsersInVoiceChannel = (channelId: string) => {
    console.log('=== SIDEBAR: GETTING USERS FOR CHANNEL ===');
    console.log('Channel ID:', channelId);
    console.log('All voice users count:', voiceChannelUsers.length);
    
    // ПОДРОБНО логируем каждого пользователя
    voiceChannelUsers.forEach((user, index) => {
      console.log(`User ${index}:`, {
        user_id: user.user_id,
        username: user.username,
        channel_id: user.channel_id,
        isMuted: user.isMuted,
        isSpeaking: user.isSpeaking
      });
    });
    
    const users = voiceChannelUsers.filter((u: any) => {
      const match = u.channel_id === channelId;
      console.log(`User ${u.username || u.user_id} in channel ${u.channel_id}, looking for ${channelId}, match: ${match}`);
      return match;
    });
    
    console.log('Found users for channel:', users);
    return users;
  };

  return (
    <div className="w-60 bg-discord-channel-bg flex flex-col">
      {/* Server Header */}
      <div className="h-16 px-4 border-b border-border flex items-center justify-between hover:bg-discord-channel-hover cursor-pointer">
        <h2 className="font-semibold text-foreground">{serverName}</h2>
        <ChevronDown className="h-4 w-4 text-discord-channel-text" />
      </div>

      {/* Channels */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* Text Channels */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-discord-channel-text uppercase tracking-wider">
                Текстовые каналы
              </span>
              <Plus className="h-4 w-4 text-discord-channel-text hover:text-foreground cursor-pointer" />
            </div>
            
            {loading ? (
              <div className="text-xs text-discord-channel-text px-2">Загрузка...</div>
            ) : (
              channels.filter(ch => ch.type === "text").map((channel) => (
                <Button
                  key={channel.id}
                  variant="ghost"
                  className={`w-full justify-start px-2 py-1 h-8 rounded-md mb-0.5 ${
                    activeChannel === channel.id
                      ? "bg-discord-server-active text-foreground"
                      : "text-discord-channel-text hover:bg-discord-channel-hover hover:text-foreground"
                  }`}
                  onClick={() => onChannelChange(channel.id)}
                >
                  <Hash className="h-4 w-4 mr-2" />
                  <span className="flex-1 text-left">{channel.name}</span>
                </Button>
              ))
            )}
          </div>

          {/* Voice Channels */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-discord-channel-text uppercase tracking-wider">
                Голосовые каналы
              </span>
              <Plus className="h-4 w-4 text-discord-channel-text hover:text-foreground cursor-pointer" />
            </div>
            
            {loading ? (
              <div className="text-xs text-discord-channel-text px-2">Загрузка...</div>
            ) : (
              channels.filter(ch => ch.type === "voice").map((channel) => {
                const usersInChannel = getUsersInVoiceChannel(channel.id);
                return (
                  <div key={channel.id} className="mb-1">
                    <Button
                      variant="ghost"
                      className={`w-full justify-start px-2 py-1 h-8 rounded-md ${
                        activeChannel === channel.id
                          ? "bg-discord-server-active text-foreground"
                          : "text-discord-channel-text hover:bg-discord-channel-hover hover:text-foreground"
                      }`}
                      onClick={() => onChannelChange(channel.id)}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      <span className="flex-1 text-left">{channel.name}</span>
                      {usersInChannel.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-4 text-xs">
                          {usersInChannel.length}
                        </Badge>
                      )}
                    </Button>
                    
                    {/* Пользователи в голосовом канале */}
                    {usersInChannel.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {usersInChannel.map((voiceUser: any) => (
                          <div
                            key={voiceUser.user_id}
                            className="flex items-center gap-2 px-2 py-1 text-sm text-discord-channel-text hover:text-foreground rounded"
                          >
                            <div className="relative">
                              <Avatar className={`h-5 w-5 ${voiceUser.isSpeaking ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-discord-channel-bg' : ''}`}>
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {voiceUser.username?.charAt(0)?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {voiceUser.isSpeaking && (
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              )}
                            </div>
                            <span className="flex-1 truncate text-xs">
                              {voiceUser.username}
                            </span>
                            {voiceUser.isMuted && (
                              <div className="w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* User Panel */}
      <div className="h-16 bg-discord-chat-input p-2 border-t border-border">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                Я
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-discord-online border-2 border-discord-chat-input rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              {user?.email?.split('@')[0] || 'Пользователь'}
            </div>
            <div className="text-xs text-discord-channel-text truncate">В сети</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-discord-channel-text hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};