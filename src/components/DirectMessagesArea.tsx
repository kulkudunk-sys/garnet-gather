import { useState, useEffect } from "react";
import { Search, UserPlus, Users, MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface DirectMessagesAreaProps {
  onCreateDM?: (userId: string) => void;
}

export const DirectMessagesArea = ({ onCreateDM }: DirectMessagesAreaProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("friends");
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  // Заглушки для демонстрации
  const mockFriends = [
    { id: "1", username: "alex_gamer", display_name: "Alex", account_number: 1234, status: "online", avatar_url: null },
    { id: "2", username: "maria_dev", display_name: "Maria", account_number: 5678, status: "offline", avatar_url: null },
    { id: "3", username: "john_doe", display_name: "John", account_number: 9012, status: "online", avatar_url: null },
  ];

  const mockRequests = [
    { id: "1", username: "new_user", display_name: "New User", account_number: 3456, status: "pending" },
  ];

  useEffect(() => {
    setFriends(mockFriends);
    setFriendRequests(mockRequests);
  }, []);

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.account_number.toString().includes(searchQuery);
    const matchesFilter = filter === "all" || friend.status === "online";
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-discord-online";
      case "away": return "bg-discord-away";
      case "busy": return "bg-discord-busy";
      default: return "bg-discord-offline";
    }
  };

  return (
    <div className="flex-1 bg-discord-chat-bg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-accent/20">
        <div className="flex items-center gap-4 mb-4">
          <Users className="w-6 h-6 text-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Друзья</h1>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-sm"
          >
            Все
          </Button>
          <Button
            variant={filter === "online" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("online")}
            className="text-sm"
          >
            В сети
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm text-green-400 hover:text-green-300"
          >
            Добавить в друзья
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-discord-chat-input border-none"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">Друзья ({friends.length})</TabsTrigger>
            <TabsTrigger value="requests">
              Запросы общения {friendRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {friendRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="friends" className="space-y-2 p-4">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {filter === "online" ? "Никого нет в сети" : "Нет друзей"}
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-discord-message-hover transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {friend.display_name?.[0]?.toUpperCase() || friend.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-discord-chat-bg ${getStatusColor(friend.status)}`} />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {friend.display_name || friend.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {friend.username}#{friend.account_number}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onCreateDM?.(friend.id)}
                      className="h-8 w-8"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="requests" className="space-y-2 p-4">
            {friendRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Нет запросов в друзья
              </div>
            ) : (
              friendRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-discord-message-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {request.display_name?.[0]?.toUpperCase() || request.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">
                        {request.display_name || request.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.username}#{request.account_number}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                    >
                      Принять
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};