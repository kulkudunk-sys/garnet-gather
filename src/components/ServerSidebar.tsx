import { Home, Plus, Hash } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const servers = [
  { id: "home", name: "Home", icon: Home, isHome: true },
  { id: "1", name: "Gaming", avatar: "G", color: "bg-blue-500" },
  { id: "2", name: "Work", avatar: "W", color: "bg-green-500" },
  { id: "3", name: "Friends", avatar: "F", color: "bg-purple-500" },
];

interface ServerSidebarProps {
  activeServer: string;
  onServerChange: (serverId: string) => void;
}

export const ServerSidebar = ({ activeServer, onServerChange }: ServerSidebarProps) => {
  return (
    <div className="w-18 bg-discord-server-bg flex flex-col items-center py-3 space-y-2">
      {servers.map((server) => (
        <div key={server.id} className="relative group">
          {server.isHome ? (
            <Button
              variant={activeServer === server.id ? "default" : "ghost"}
              size="icon"
              className={`w-12 h-12 rounded-2xl transition-all duration-200 hover:rounded-xl ${
                activeServer === server.id
                  ? "bg-discord-server-active rounded-xl"
                  : "bg-discord-channel-bg hover:bg-discord-server-hover hover:rounded-xl"
              }`}
              onClick={() => onServerChange(server.id)}
            >
              <server.icon className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`w-12 h-12 rounded-2xl transition-all duration-200 hover:rounded-xl p-0 ${
                activeServer === server.id
                  ? "bg-discord-server-active rounded-xl"
                  : "hover:bg-discord-server-hover hover:rounded-xl"
              }`}
              onClick={() => onServerChange(server.id)}
            >
              <Avatar className="w-12 h-12">
                <AvatarImage src="" />
                <AvatarFallback className={`${server.color} text-white font-semibold`}>
                  {server.avatar}
                </AvatarFallback>
              </Avatar>
            </Button>
          )}
          
          {/* Server indicator */}
          {activeServer === server.id && (
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-foreground rounded-r-full -ml-1" />
          )}
          
          {/* Tooltip */}
          <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
            {server.name}
          </div>
        </div>
      ))}
      
      {/* Add server button */}
      <div className="relative group">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-2xl bg-discord-channel-bg hover:bg-discord-server-hover hover:rounded-xl transition-all duration-200 text-discord-channel-text hover:text-foreground"
        >
          <Plus className="h-6 w-6" />
        </Button>
        
        <div className="absolute left-16 top-1/2 transform -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          Добавить сервер
        </div>
      </div>
    </div>
  );
};