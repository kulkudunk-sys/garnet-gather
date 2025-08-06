import { Volume2, VolumeX, Mic, MicOff, Phone, PhoneOff, Users } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useVoiceChannel } from "@/hooks/useVoiceChannel";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { UserList } from "./UserList";

interface VoiceChannelInterfaceProps {
  channelId: string;
  channelName: string;
  serverId?: string;
  onClose?: () => void;
}

export const VoiceChannelInterface = ({ channelId, channelName, serverId, onClose }: VoiceChannelInterfaceProps) => {
  const {
    isConnected,
    isRecording,
    isMuted,
    isSpeaking,
    connectedUsers,
    disconnectFromVoiceChannel,
    toggleMute
  } = useVoiceChannel(channelId);

  const handleDisconnect = () => {
    disconnectFromVoiceChannel();
    onClose?.();
  };

  return (
    <div className="flex-1 bg-discord-chat-bg flex">
      {/* Main Voice Interface */}
      <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-foreground" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{channelName}</h1>
              <p className="text-sm text-muted-foreground">
                {isConnected ? `${connectedUsers.length} участников в канале` : "Голосовой канал"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Подключен" : "Не подключен"}
            </Badge>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Закрыть
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Voice Controls */}
      <div className="p-4 border-b border-accent/20">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDisconnect}
            className="gap-2"
          >
            <PhoneOff className="w-4 h-4" />
            Покинуть канал
          </Button>
          
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleMute}
            className="gap-2"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isMuted ? "Включить микрофон" : "Выключить микрофон"}
          </Button>
        </div>
        
        {/* Status Indicators */}
        <div className="flex justify-center gap-4 mt-4">
          <Badge variant="default" className="animate-pulse">
            🔊 Подключен к голосовому каналу
          </Badge>
          {isSpeaking && (
            <Badge variant="default" className="animate-pulse bg-green-600">
              🎤 Вы говорите
            </Badge>
          )}
          {isRecording && !isMuted && !isSpeaking && (
            <Badge variant="secondary">
              🎤 Микрофон активен
            </Badge>
          )}
          {isMuted && (
            <Badge variant="destructive">
              🔇 Микрофон выключен
            </Badge>
          )}
        </div>
      </div>

      {/* Connected Users */}
      <div className="flex-1 overflow-auto p-4">
        {!isConnected ? (
          <div className="text-center text-muted-foreground py-8">
            <Volume2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>Подключение к голосовому каналу...</p>
            <p className="text-sm mt-2">Настройка голосового соединения...</p>
          </div>
        ) : connectedUsers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>Вы подключены к голосовому каналу</p>
            <p className="text-sm mt-2">Ожидание других участников...</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Участники голосового канала ({connectedUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div className="relative">
                    <Avatar className={`w-10 h-10 ${user.isSpeaking ? 'ring-4 ring-green-500 ring-offset-2 ring-offset-background animate-pulse' : ''}`}>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.isSpeaking && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{user.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.isMuted ? "Микрофон выключен" : "В голосовом канале"}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {user.isMuted ? (
                      <MicOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Mic className="w-4 h-4 text-green-500" />
                    )}
                    {user.isSpeaking && (
                      <div className="flex gap-1">
                        <div className="w-1 h-4 bg-green-500 rounded animate-pulse" />
                        <div className="w-1 h-3 bg-green-500 rounded animate-pulse delay-75" />
                        <div className="w-1 h-2 bg-green-500 rounded animate-pulse delay-150" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      </div>
      
      {/* Server Members List */}
      {serverId && (
        <div className="w-60 bg-discord-sidebar-bg border-l border-accent/20">
          <UserList serverId={serverId} />
        </div>
      )}
    </div>
  );
};