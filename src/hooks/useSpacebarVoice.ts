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
    console.log('🔊 Starting voice channel connection:', channelId);
    
    try {
      // Check if user is authenticated
      const user = spacebarClient.getUser();
      if (!user) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('✅ User authenticated:', user.username);

      // Since Spacebar server is not available, use simulation immediately
      console.log('🎭 Using simulated voice connection');
      
      setVoiceState(prev => ({
        ...prev,
        channelId,
        isConnected: true,
        connectedUsers: [{
          id: user.id,
          username: user.username,
          isMuted: false,
          isSpeaking: false,
          isDeafened: false
        }]
      }));
      
      console.log('✅ Voice connection simulated successfully for channel:', channelId);

    } catch (error) {
      console.error('❌ Voice connection failed:', error);
      
      // Set error state
      setVoiceState(prev => ({
        ...prev,
        isConnected: false,
        channelId: null,
        connectedUsers: []
      }));
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