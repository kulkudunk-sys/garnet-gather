import { Send, Smile, Plus, Gift, Image } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState, useEffect } from "react";
import { useRealtimeMessages } from "@/hooks/useRealtime";
import { api } from "@/lib/api";

interface ChatAreaProps {
  channelId: string | null;
  channelName: string;
  channelType: string;
}

export const ChatArea = ({ channelId, channelName, channelType }: ChatAreaProps) => {
  const [newMessage, setNewMessage] = useState("");
  const { messages, setMessages } = useRealtimeMessages(channelId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && channelId) {
      try {
        await api.sendMessage(channelId, newMessage);
        setNewMessage("");
      } catch (error) {
        console.error("Ошибка отправки сообщения:", error);
      }
    }
  };

  if (channelType === "voice") {
    return (
      <div className="flex-1 bg-discord-chat-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎤</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Голосовой канал</h2>
          <p className="text-discord-channel-text mb-6">
            Подключитесь к голосовому каналу "{channelName}"
          </p>
          <Button className="bg-discord-server-active hover:bg-discord-server-hover">
            Присоединиться к каналу
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-discord-chat-bg flex flex-col">
      {/* Channel Header */}
      <div className="h-16 px-6 border-b border-border flex items-center">
        <div className="flex items-center space-x-2">
          <span className="text-discord-channel-text">#</span>
          <h2 className="text-lg font-semibold text-foreground">{channelName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-discord-channel-text">
            <p>Пока нет сообщений в этом канале</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
            const timestamp = new Date(message.created_at).toLocaleTimeString('ru-RU', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            return (
              <div
                key={message.id}
                className={`group hover:bg-discord-message-hover px-4 py-1 rounded ${
                  showAvatar ? "pt-3" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  {showAvatar ? (
                    <Avatar className="h-10 w-10 mt-0.5">
                      <AvatarImage src={message.profiles.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {message.profiles.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      <span className="text-xs text-discord-channel-text opacity-0 group-hover:opacity-100 transition-opacity">
                        {timestamp}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-baseline space-x-2 mb-1">
                        <span className="font-semibold text-foreground">
                          {message.profiles.display_name || message.profiles.username}
                        </span>
                        <span className="text-xs text-discord-channel-text">{timestamp}</span>
                      </div>
                    )}
                    <p className="text-foreground text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <div className="p-4">
        <form onSubmit={handleSendMessage} className="relative">
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-6 w-6 text-discord-channel-text hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            <Input
              placeholder={`Написать в #${channelName}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="pl-12 pr-24 py-3 bg-discord-chat-input border-none focus:ring-1 focus:ring-primary rounded-lg text-foreground placeholder:text-discord-channel-text"
            />
            
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-discord-channel-text hover:text-foreground"
              >
                <Gift className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-discord-channel-text hover:text-foreground"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-discord-channel-text hover:text-foreground"
              >
                <Smile className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};