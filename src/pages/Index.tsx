import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ServerSidebar } from "@/components/ServerSidebar";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { ChatArea } from "@/components/ChatArea";
import { UserList } from "@/components/UserList";
import { DirectMessagesSidebar } from "@/components/DirectMessagesSidebar";
import { DirectMessagesArea } from "@/components/DirectMessagesArea";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { api } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, isAuthenticated } = useAuth();
  const [activeServer, setActiveServer] = useState("");
  const [activeChannel, setActiveChannel] = useState("");
  const [activeDirectMessage, setActiveDirectMessage] = useState("");
  const [servers, setServers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);

  useEffect(() => {
    const loadServers = async () => {
      if (!isAuthenticated) return;
      
      try {
        const serversData = await api.getServers();
        setServers(serversData);
        
        // По умолчанию открываем личные сообщения
        if (!activeServer) {
          setActiveServer("home");
          setActiveDirectMessage("friends");
        }
      } catch (error) {
        console.error("Ошибка загрузки серверов:", error);
        // Даже если серверы не загрузились, открываем личные сообщения
        if (!activeServer) {
          setActiveServer("home");
          setActiveDirectMessage("friends");
        }
      }
    };

    loadServers();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadChannels = async () => {
      if (!activeServer || activeServer === "home") return;
      
      try {
        const channelsData = await api.getChannels(activeServer);
        setChannels(channelsData);
        
        // Выбираем первый канал по умолчанию
        if (channelsData.length > 0 && !activeChannel) {
          setActiveChannel(channelsData[0].id);
        }
      } catch (error) {
        console.error("Ошибка загрузки каналов:", error);
      }
    };

    loadChannels();
  }, [activeServer]);

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

  const currentServer = servers.find(s => s.id === activeServer);
  const currentChannel = channels.find(c => c.id === activeChannel);
  const isInDirectMessages = activeServer === "home" || !activeServer;

  const handleServerChange = async (serverId: string) => {
    setActiveServer(serverId);
    setActiveChannel("");
    setActiveDirectMessage("");
    
    if (serverId === "home") {
      // Переключение на личные сообщения
      setActiveDirectMessage("friends");
      return;
    }
    
    // Загружаем каналы для нового сервера
    try {
      const channelsData = await api.getChannels(serverId);
      setChannels(channelsData);
      
      // Автоматически переключаемся на первый канал
      if (channelsData.length > 0) {
        setActiveChannel(channelsData[0].id);
      }
    } catch (error) {
      console.error("Ошибка загрузки каналов:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAuthPageClick = () => {
    navigate('/auth');
  };

  const handleDirectMessageChange = (chatId: string) => {
    setActiveDirectMessage(chatId);
    setActiveChannel("");
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Server Sidebar */}
      <ServerSidebar 
        activeServer={activeServer}
        onServerChange={handleServerChange}
      />
      
      {/* Conditional Sidebar */}
      {isInDirectMessages ? (
        <DirectMessagesSidebar 
          activeChat={activeDirectMessage}
          onChatChange={handleDirectMessageChange}
        />
      ) : (
        activeServer && (
          <ChannelSidebar 
            serverId={activeServer}
            serverName={currentServer?.name || "Server"}
            activeChannel={activeChannel}
            onChannelChange={setActiveChannel}
          />
        )
      )}
      
      {/* Main Content Area */}
      {isInDirectMessages ? (
        <DirectMessagesArea />
      ) : (
        activeChannel && currentChannel && (
          <ChatArea 
            channelId={activeChannel}
            channelName={currentChannel?.name || "канал"}
            channelType={currentChannel?.type || "text"}
            serverId={activeServer}
          />
        )
      )}
      
      {/* User List - только для текстовых каналов серверов */}
      {!isInDirectMessages && currentChannel?.type === "text" && (
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
          <UserList serverId={activeServer} />
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
