import { useState, useCallback, useEffect } from 'react';
import { spacebarClient } from '@/lib/spacebar';

interface VoiceUser {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
}

interface VoiceChannelState {
  channelId: string | null;
  isConnected: boolean;
  connectedUsers: VoiceUser[];
  isRecording: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  volume: number;
}

export const useSpacebarVoice = () => {
  const [voiceState, setVoiceState] = useState<VoiceChannelState>({
    channelId: null,
    isConnected: false,
    connectedUsers: [],
    isRecording: false,
    isMuted: false,
    isDeafened: false,
    volume: 100
  });

  const connectToVoiceChannel = useCallback(async (channelId: string) => {
    try {
      // Find the guild for this channel (simplified - assuming first guild)
      const guilds = spacebarClient.getGuilds();
      const guild = guilds[0]; // You might want to make this more specific
      
      if (!guild) {
        throw new Error('No guild found');
      }

      // Set up event listeners for voice events
      const handleVoiceReady = (data: any) => {
        console.log('Voice ready:', data);
        setVoiceState(prev => ({
          ...prev,
          channelId,
          isConnected: true
        }));
      };

      const handleVoiceSpeaking = (data: any) => {
        setVoiceState(prev => ({
          ...prev,
          connectedUsers: prev.connectedUsers.map(user => 
            user.id === data.user_id 
              ? { ...user, isSpeaking: data.speaking > 0 }
              : user
          )
        }));
      };

      const handleVoiceStateUpdate = (data: any) => {
        if (data.channel_id === channelId) {
          const user = {
            id: data.user_id,
            username: data.member?.user?.username || 'Unknown',
            isMuted: data.self_mute || data.mute,
            isSpeaking: false,
            isDeafened: data.self_deaf || data.deaf
          };

          setVoiceState(prev => {
            const existingUsers = prev.connectedUsers.filter(u => u.id !== data.user_id);
            return {
              ...prev,
              connectedUsers: data.channel_id ? [...existingUsers, user] : existingUsers
            };
          });
        }
      };

      const handleVoiceDisconnected = () => {
        setVoiceState(prev => ({
          ...prev,
          isConnected: false,
          channelId: null,
          connectedUsers: []
        }));
      };

      // Set up event listeners
      spacebarClient.on('voiceReady', handleVoiceReady);
      spacebarClient.on('voiceSpeaking', handleVoiceSpeaking);
      spacebarClient.on('voiceStateUpdate', handleVoiceStateUpdate);
      spacebarClient.on('voiceDisconnected', handleVoiceDisconnected);

      // Connect to voice channel through Spacebar
      await spacebarClient.connectToVoiceChannel(guild.id, channelId);

      console.log(`Connected to voice channel: ${channelId}`);

    } catch (error) {
      console.error('Failed to connect to voice channel:', error);
      setVoiceState(prev => ({
        ...prev,
        isConnected: false,
        channelId: null
      }));
      throw error;
    }
  }, []);


  const disconnectFromVoiceChannel = useCallback(async () => {
    try {
      // Disconnect through Spacebar client
      await spacebarClient.disconnectFromVoiceChannel();

      // Reset voice state
      setVoiceState({
        channelId: null,
        isConnected: false,
        connectedUsers: [],
        isRecording: false,
        isMuted: false,
        isDeafened: false,
        volume: 100
      });

      console.log('Disconnected from voice channel');
    } catch (error) {
      console.error('Error disconnecting from voice channel:', error);
    }
  }, []);

  const toggleMute = useCallback(async () => {
    try {
      const newMutedState = !voiceState.isMuted;
      
      // Update voice state through Spacebar client
      spacebarClient.setVoiceState(newMutedState, voiceState.isDeafened);

      setVoiceState(prev => ({
        ...prev,
        isMuted: newMutedState
      }));

      console.log('Mute toggled:', newMutedState);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [voiceState.isMuted, voiceState.isDeafened]);

  const toggleDeafen = useCallback(async () => {
    try {
      const newDeafenedState = !voiceState.isDeafened;
      const newMutedState = newDeafenedState ? true : voiceState.isMuted;

      // Update voice state through Spacebar client
      spacebarClient.setVoiceState(newMutedState, newDeafenedState);

      setVoiceState(prev => ({
        ...prev,
        isDeafened: newDeafenedState,
        isMuted: newMutedState
      }));

      console.log('Deafen toggled:', newDeafenedState);
    } catch (error) {
      console.error('Error toggling deafen:', error);
    }
  }, [voiceState.isDeafened, voiceState.isMuted]);

  const setVolume = useCallback((volume: number) => {
    try {
      setVoiceState(prev => ({
        ...prev,
        volume: Math.max(0, Math.min(100, volume))
      }));

      // Note: Volume control would be handled by Spacebar server
      console.log(`Volume set to: ${volume}%`);
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromVoiceChannel();
    };
  }, [disconnectFromVoiceChannel]);

  return {
    voiceState,
    connectToVoiceChannel,
    disconnectFromVoiceChannel,
    toggleMute,
    toggleDeafen,
    setVolume,
    // Aliases for compatibility
    isConnected: voiceState.isConnected,
    connectedUsers: voiceState.connectedUsers,
    isMuted: voiceState.isMuted,
    isRecording: voiceState.isRecording,
    currentChannelId: voiceState.channelId
  };
};