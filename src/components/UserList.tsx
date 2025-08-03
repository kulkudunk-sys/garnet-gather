import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Crown, Mic, MicOff, Headphones } from "lucide-react";

const onlineUsers = [
  { 
    id: "1", 
    name: "Алексей", 
    status: "online", 
    avatar: "А", 
    role: "admin",
    activity: "Играет в Cyberpunk 2077",
    isOwner: true
  },
  { 
    id: "2", 
    name: "Мария", 
    status: "away", 
    avatar: "М", 
    role: "moderator",
    activity: "VS Code",
    voice: { muted: false, deafened: false }
  },
  { 
    id: "3", 
    name: "Дмитрий", 
    status: "busy", 
    avatar: "Д", 
    role: "member",
    activity: "В игре",
    voice: { muted: true, deafened: false }
  },
];

const offlineUsers = [
  { id: "4", name: "Елена", status: "offline", avatar: "Е", role: "member" },
  { id: "5", name: "Иван", status: "offline", avatar: "И", role: "member" },
  { id: "6", name: "Анна", status: "offline", avatar: "А", role: "member" },
];

export const UserList = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-discord-online";
      case "away": return "bg-discord-away";
      case "busy": return "bg-discord-busy";
      default: return "bg-discord-offline";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "text-red-400";
      case "moderator": return "text-blue-400";
      default: return "text-discord-channel-text";
    }
  };

  return (
    <div className="w-60 bg-discord-channel-bg border-l border-border flex flex-col">
      {/* Online Users */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-discord-channel-text uppercase tracking-wider mb-3">
          В сети — {onlineUsers.length}
        </h3>
        
        <div className="space-y-2">
          {onlineUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-discord-channel-hover cursor-pointer group"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status)} border-2 border-discord-channel-bg rounded-full`} />
                {user.isOwner && (
                  <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <span className={`text-sm font-medium ${getRoleColor(user.role)} truncate`}>
                    {user.name}
                  </span>
                  {user.voice && (
                    <div className="flex items-center space-x-1">
                      {user.voice.muted ? (
                        <MicOff className="h-3 w-3 text-red-400" />
                      ) : (
                        <Mic className="h-3 w-3 text-green-400" />
                      )}
                      {user.voice.deafened && (
                        <Headphones className="h-3 w-3 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                {user.activity && (
                  <div className="text-xs text-discord-channel-text truncate">
                    {user.activity}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offline Users */}
      <div className="p-4 border-t border-border">
        <h3 className="text-xs font-semibold text-discord-channel-text uppercase tracking-wider mb-3">
          Не в сети — {offlineUsers.length}
        </h3>
        
        <div className="space-y-2">
          {offlineUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-discord-channel-hover cursor-pointer opacity-60"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {user.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(user.status)} border-2 border-discord-channel-bg rounded-full`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-sm text-discord-channel-text truncate">
                  {user.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};