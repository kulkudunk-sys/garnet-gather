import { useState, useEffect } from "react";
import { Hash, MessageCircle, UserPlus, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface DirectMessagesSidebarProps {
  activeChat?: string;
  onChatChange?: (chatId: string) => void;
  onAddFriend?: () => void;
}

export const DirectMessagesSidebar = ({ 
  activeChat, 
  onChatChange,
  onAddFriend 
}: DirectMessagesSidebarProps) => {
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  
  // Заглушки для демонстрации
  const mockDMs = [
    {
      id: "dm1",
      user: {
        id: "user1",
        username: "alex_gamer",
        display_name: "Alex",
        avatar_url: null,
        status: "online"
      },
      lastMessage: {
        content: "Привет! Как дела?",
        timestamp: "5 мин назад",
        unread: true
      }
    },
    {
      id: "dm2", 
      user: {
        id: "user2",
        username: "maria_dev",
        display_name: "Maria",
        avatar_url: null,
        status: "offline"
      },
      lastMessage: {
        content: "Увидимся завтра!",
        timestamp: "2 ч назад",
        unread: false
      }
    }
  ];

  useEffect(() => {
    setDirectMessages(mockDMs);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-discord-online";
      case "away": return "bg-discord-away";
      case "busy": return "bg-discord-busy";
      default: return "bg-discord-offline";
    }
  };

  return (
    <div className="w-60 bg-discord-channel-bg flex flex-col border-r border-accent/20">
      {/* Header */}
      <div className="p-4 border-b border-accent/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Личные сообщения</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddFriend}
            className="h-6 w-6 text-discord-channel-text hover:text-foreground"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick Actions */}
        <div className="space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-start text-sm h-8 ${
              activeChat === "friends" 
                ? "bg-discord-channel-hover text-foreground" 
                : "text-discord-channel-text hover:text-foreground hover:bg-discord-channel-hover"
            }`}
            onClick={() => onChatChange?.("friends")}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Друзья
          </Button>
        </div>
      </div>

      {/* Direct Messages List */}
      <div className="flex-1 overflow-auto">
        <div className="px-2 py-2">
          <div className="text-xs font-semibold text-discord-channel-text uppercase tracking-wide px-2 mb-2">
            Личные сообщения
          </div>
          
          <div className="space-y-1">
            {directMessages.map((dm) => (
              <Button
                key={dm.id}
                variant="ghost"
                className={`w-full h-auto p-2 justify-start ${
                  activeChat === dm.id
                    ? "bg-discord-channel-hover text-foreground"
                    : "text-discord-channel-text hover:text-foreground hover:bg-discord-channel-hover"
                }`}
                onClick={() => onChatChange?.(dm.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={dm.user.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {dm.user.display_name?.[0]?.toUpperCase() || dm.user.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-discord-channel-bg ${getStatusColor(dm.user.status)}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-medium text-sm truncate">
                      {dm.user.display_name || dm.user.username}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {dm.lastMessage.content}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs text-muted-foreground">
                      {dm.lastMessage.timestamp}
                    </div>
                    {dm.lastMessage.unread && (
                      <Badge variant="destructive" className="w-2 h-2 p-0 rounded-full" />
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* User Info at Bottom */}
      <div className="p-2 border-t border-accent/20">
        <div className="flex items-center gap-2 p-2 rounded hover:bg-discord-channel-hover">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              У
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">
              Пользователь
            </div>
            <div className="text-xs text-discord-channel-text">
              #1234
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};