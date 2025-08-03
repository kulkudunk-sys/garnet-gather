import { Hash, Volume2, Settings, ChevronDown, Plus, UserPlus } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

const channels = [
  { id: "general", name: "общий", type: "text", unread: 3 },
  { id: "random", name: "случайное", type: "text", unread: 0 },
  { id: "gaming", name: "игры", type: "text", unread: 1 },
  { id: "voice1", name: "Общий голосовой", type: "voice", users: 2 },
  { id: "voice2", name: "Игры", type: "voice", users: 0 },
];

const onlineUsers = [
  { id: "1", name: "Алексей", status: "online", avatar: "А" },
  { id: "2", name: "Мария", status: "away", avatar: "М" },
  { id: "3", name: "Дмитрий", status: "busy", avatar: "Д" },
];

const offlineUsers = [
  { id: "4", name: "Елена", status: "offline", avatar: "Е" },
  { id: "5", name: "Иван", status: "offline", avatar: "И" },
];

interface ChannelSidebarProps {
  serverName: string;
  activeChannel: string;
  onChannelChange: (channelId: string) => void;
}

export const ChannelSidebar = ({ serverName, activeChannel, onChannelChange }: ChannelSidebarProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-discord-online";
      case "away": return "bg-discord-away";
      case "busy": return "bg-discord-busy";
      default: return "bg-discord-offline";
    }
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
            
            {channels.filter(ch => ch.type === "text").map((channel) => (
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
                {channel.unread > 0 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-xs">
                    {channel.unread}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Voice Channels */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="text-xs font-semibold text-discord-channel-text uppercase tracking-wider">
                Голосовые каналы
              </span>
              <Plus className="h-4 w-4 text-discord-channel-text hover:text-foreground cursor-pointer" />
            </div>
            
            {channels.filter(ch => ch.type === "voice").map((channel) => (
              <Button
                key={channel.id}
                variant="ghost"
                className="w-full justify-start px-2 py-1 h-8 rounded-md mb-0.5 text-discord-channel-text hover:bg-discord-channel-hover hover:text-foreground"
                onClick={() => onChannelChange(channel.id)}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                <span className="flex-1 text-left">{channel.name}</span>
                {channel.users > 0 && (
                  <span className="text-xs text-discord-channel-text">{channel.users}</span>
                )}
              </Button>
            ))}
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
            <div className="text-sm font-medium text-foreground truncate">Мой профиль</div>
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