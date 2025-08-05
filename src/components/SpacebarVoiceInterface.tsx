import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, Users } from 'lucide-react';
import { useSpacebarVoice } from '@/hooks/useSpacebarVoice';
import { cn } from '@/lib/utils';

interface SpacebarVoiceInterfaceProps {
  channelId: string | null;
  channelName?: string;
}

export const SpacebarVoiceInterface: React.FC<SpacebarVoiceInterfaceProps> = ({
  channelId,
  channelName = 'Voice Channel'
}) => {
  const {
    voiceState,
    connectToVoiceChannel,
    disconnectFromVoiceChannel,
    toggleMute,
    toggleDeafen,
    setVolume
  } = useSpacebarVoice();

  const handleConnect = async () => {
    if (!channelId) return;
    
    try {
      await connectToVoiceChannel(channelId);
    } catch (error) {
      console.error('Failed to connect to voice channel:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromVoiceChannel();
    } catch (error) {
      console.error('Failed to disconnect from voice channel:', error);
    }
  };

  if (!channelId) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Select a voice channel to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          {channelName}
          {voiceState.connected && (
            <Badge variant="secondary" className="ml-auto">
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex gap-2">
          {!voiceState.connected ? (
            <Button 
              onClick={handleConnect} 
              className="flex-1"
              size="sm"
            >
              <Phone className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <Button 
              onClick={handleDisconnect} 
              variant="destructive" 
              className="flex-1"
              size="sm"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {voiceState.connected && (
          <>
            {/* Audio Controls */}
            <div className="flex gap-2">
              <Button
                onClick={toggleMute}
                variant={voiceState.isMuted ? "destructive" : "outline"}
                size="sm"
                className="flex-1"
              >
                {voiceState.isMuted ? (
                  <MicOff className="h-4 w-4 mr-2" />
                ) : (
                  <Mic className="h-4 w-4 mr-2" />
                )}
                {voiceState.isMuted ? 'Unmute' : 'Mute'}
              </Button>

              <Button
                onClick={toggleDeafen}
                variant={voiceState.isDeafened ? "destructive" : "outline"}
                size="sm"
                className="flex-1"
              >
                {voiceState.isDeafened ? (
                  <VolumeX className="h-4 w-4 mr-2" />
                ) : (
                  <Volume2 className="h-4 w-4 mr-2" />
                )}
                {voiceState.isDeafened ? 'Undeafen' : 'Deafen'}
              </Button>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Volume</label>
                <span className="text-sm text-muted-foreground">
                  {voiceState.volume}%
                </span>
              </div>
              <Slider
                value={[voiceState.volume]}
                onValueChange={(value) => setVolume(value[0])}
                max={100}
                min={0}
                step={5}
                className="w-full"
              />
            </div>

            {/* Connected Users */}
            {voiceState.users.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Connected Users ({voiceState.users.length})</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {voiceState.users.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md text-sm",
                        "bg-secondary/50",
                        user.isSpeaking && "bg-primary/20 ring-1 ring-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {user.isMuted ? (
                          <MicOff className="h-3 w-3 text-destructive" />
                        ) : user.isSpeaking ? (
                          <Mic className="h-3 w-3 text-primary animate-pulse" />
                        ) : (
                          <Mic className="h-3 w-3 text-muted-foreground" />
                        )}
                        {user.isDeafened && (
                          <VolumeX className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                      <span className="flex-1 truncate">{user.username}</span>
                      {user.isSpeaking && (
                        <Badge variant="outline" className="text-xs py-0">
                          Speaking
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recording Indicator */}
            {voiceState.isRecording && !voiceState.isMuted && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Recording
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};