import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ServerSidebar } from "@/components/ServerSidebar";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { ChatArea } from "@/components/ChatArea";
import { UserList } from "@/components/UserList";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const servers = {
  home: { name: "Личные сообщения", channels: [] },
  "1": { name: "Gaming Server", channels: ["general", "random", "gaming", "voice1", "voice2"] },
  "2": { name: "Work Space", channels: ["general", "announcements", "projects"] },
  "3": { name: "Friends", channels: ["general", "memes", "voice-chat"] },
};

const channels = {
  general: { name: "общий", type: "text" },
  random: { name: "случайное", type: "text" },
  gaming: { name: "игры", type: "text" },
  voice1: { name: "Общий голосовой", type: "voice" },
  voice2: { name: "Игры", type: "voice" },
  announcements: { name: "объявления", type: "text" },
  projects: { name: "проекты", type: "text" },
  memes: { name: "мемы", type: "text" },
  "voice-chat": { name: "Голосовой чат", type: "voice" },
};

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const [activeServer, setActiveServer] = useState("1");
  const [activeChannel, setActiveChannel] = useState("general");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentServer = servers[activeServer as keyof typeof servers];
  const currentChannel = channels[activeChannel as keyof typeof channels];

  const handleServerChange = (serverId: string) => {
    setActiveServer(serverId);
    // Автоматически переключаемся на первый канал сервера
    const server = servers[serverId as keyof typeof servers];
    if (server && server.channels.length > 0) {
      setActiveChannel(server.channels[0]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAuthPageClick = () => {
    navigate('/auth');
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Server Sidebar */}
      <ServerSidebar 
        activeServer={activeServer}
        onServerChange={handleServerChange}
      />
      
      {/* Channel Sidebar */}
      <ChannelSidebar 
        serverName={currentServer?.name || "Server"}
        activeChannel={activeChannel}
        onChannelChange={setActiveChannel}
      />
      
      {/* Chat Area */}
      <ChatArea 
        channelName={currentChannel?.name || "канал"}
        channelType={currentChannel?.type || "text"}
      />
      
      {/* User List with Auth Info */}
      {currentChannel?.type === "text" && (
        <div className="w-60 bg-secondary border-l border-accent/20 flex flex-col">
          <div className="p-4 border-b border-accent/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {user?.email || 'Пользователь'}
                </div>
                <div className="text-xs text-muted-foreground">
                  В сети
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 hover:bg-accent/20"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <UserList />
          <div className="p-4 border-t border-accent/20 mt-auto">
            <Button
              variant="ghost"
              onClick={handleAuthPageClick}
              className="w-full justify-start text-sm"
            >
              <User className="w-4 h-4 mr-2" />
              Настройки аккаунта
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
