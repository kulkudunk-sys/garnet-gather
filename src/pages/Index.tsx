import { useState } from "react";
import { ServerSidebar } from "@/components/ServerSidebar";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import { ChatArea } from "@/components/ChatArea";
import { UserList } from "@/components/UserList";

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
  const [activeServer, setActiveServer] = useState("1");
  const [activeChannel, setActiveChannel] = useState("general");

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
      
      {/* User List */}
      {currentChannel?.type === "text" && <UserList />}
    </div>
  );
};

export default Index;
