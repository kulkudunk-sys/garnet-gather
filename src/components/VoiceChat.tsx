import { useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, MessageSquare, Volume2, VolumeX } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface VoiceChatProps {
  channelId: string;
  channelName: string;
  onClose?: () => void;
}

export const VoiceChat = ({ channelId, channelName, onClose }: VoiceChatProps) => {
  const [textMessage, setTextMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  
  const {
    messages,
    isConnected,
    isRecording,
    isSpeaking,
    currentTranscript,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage
  } = useVoiceChat(channelId);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (textMessage.trim()) {
      sendTextMessage(textMessage.trim());
      setTextMessage("");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex-1 bg-discord-chat-bg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-accent/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="w-6 h-6 text-foreground" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">{channelName}</h1>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "Подключен к голосовому каналу" : "Не подключен"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "В сети" : "Офлайн"}
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
            variant={isConnected ? "destructive" : "default"}
            size="lg"
            onClick={handleConnect}
            className="gap-2"
          >
            {isConnected ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            {isConnected ? "Отключиться" : "Подключиться"}
          </Button>
          
          {isConnected && (
            <>
              <Button
                variant={isRecording ? "destructive" : "secondary"}
                size="lg"
                onClick={handleMicToggle}
                className="gap-2"
                disabled={!isConnected}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isRecording ? "Отключить микрофон" : "Включить микрофон"}
              </Button>
              
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>
        
        {/* Status Indicators */}
        <div className="flex justify-center gap-4 mt-4">
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              🎤 Запись...
            </Badge>
          )}
          {isSpeaking && (
            <Badge variant="default" className="animate-pulse">
              🔊 ИИ говорит...
            </Badge>
          )}
          {currentTranscript && (
            <Badge variant="secondary">
              📝 {currentTranscript}
            </Badge>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Volume2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>Подключитесь к голосовому каналу для начала общения</p>
            <p className="text-sm mt-2">Вы можете говорить голосом или писать текстом</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.type === 'assistant' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    🤖
                  </AvatarFallback>
                </Avatar>
              )}
              
              <Card className={`max-w-md ${
                message.type === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">
                      {message.type === 'user' ? 'Вы' : 'Голосовой помощник'}
                    </span>
                    {message.isAudio && (
                      <Volume2 className="w-3 h-3" />
                    )}
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                </CardContent>
              </Card>
              
              {message.type === 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    👤
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}
      </div>

      {/* Text Input */}
      {isConnected && (
        <div className="p-4 border-t border-accent/20">
          <form onSubmit={handleSendText} className="flex gap-2">
            <Input
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              placeholder="Написать сообщение голосовому помощнику..."
              className="flex-1"
            />
            <Button type="submit" disabled={!textMessage.trim()}>
              <MessageSquare className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};