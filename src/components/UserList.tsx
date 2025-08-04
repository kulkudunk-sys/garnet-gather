import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Crown, Mic, MicOff, Headphones } from "lucide-react";
import { useRealtimePresence } from "@/hooks/useRealtime";

interface UserListProps {
  serverId: string | null;
}

export const UserList = ({ serverId }: UserListProps) => {
  const { onlineUsers } = useRealtimePresence(serverId || 'lobby');
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
              key={user.user_id}
              className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-discord-channel-hover cursor-pointer group"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-discord-online border-2 border-discord-channel-bg rounded-full" />
              </div>
              
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {user.display_name || user.username}
                </span>
                <div className="text-xs text-discord-channel-text truncate">
                  В сети
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};