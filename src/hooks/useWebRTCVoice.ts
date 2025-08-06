import { useState, useCallback, useEffect } from 'react';
import { webrtcVoiceManager } from '@/lib/webrtcManager';
import { useAuth } from '@/hooks/useAuth';

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
  isConnecting: boolean;
}

export const useWebRTCVoice = () => {
  const { user } = useAuth();
  const [voiceState, setVoiceState] = useState<VoiceChannelState>({
    channelId: null,
    isConnected: false,
    connectedUsers: [],
    isRecording: false,
    isMuted: false,
    isDeafened: false,
    volume: 100,
    isConnecting: false
  });

  // Setup event listeners
  useEffect(() => {
    const handleUsersUpdate = (users: VoiceUser[]) => {
      console.log('👥 Voice users updated:', users.length);
      setVoiceState(prev => ({
        ...prev,
        connectedUsers: users
      }));
    };

    const handleConnectionStateChange = (isConnected: boolean) => {
      console.log('🔊 Voice connection state:', isConnected ? 'connected' : 'disconnected');
      setVoiceState(prev => ({
        ...prev,
        isConnected,
        isConnecting: false
      }));
    };

    webrtcVoiceManager.setOnUsersUpdate(handleUsersUpdate);
    webrtcVoiceManager.setOnConnectionStateChange(handleConnectionStateChange);

    return () => {
      // Cleanup
      webrtcVoiceManager.setOnUsersUpdate(() => {});
      webrtcVoiceManager.setOnConnectionStateChange(() => {});
    };
  }, []);

  const connectToVoiceChannel = useCallback(async (channelId: string) => {
    if (!user) {
      console.error('❌ User not authenticated');
      return;
    }

    try {
      console.log('🔊 Connecting to voice channel:', channelId);
      setVoiceState(prev => ({ ...prev, isConnecting: true, channelId }));

      // Extract username from email if needed
      const username = user.email?.split('@')[0] || 'User';
      
      await webrtcVoiceManager.connectToChannel(channelId, user.id, username);
      
      console.log('✅ Voice connection established');
    } catch (error) {
      console.error('❌ Failed to connect to voice channel:', error);
      setVoiceState(prev => ({
        ...prev,
        isConnecting: false,
        isConnected: false,
        channelId: null
      }));
    }
  }, [user]);

  const disconnectFromVoiceChannel = useCallback(async () => {
    try {
      console.log('🔇 Disconnecting from voice channel');
      await webrtcVoiceManager.disconnectFromChannel();
      
      setVoiceState({
        channelId: null,
        isConnected: false,
        connectedUsers: [],
        isRecording: false,
        isMuted: false,
        isDeafened: false,
        volume: 100,
        isConnecting: false
      });

      console.log('✅ Disconnected from voice channel');
    } catch (error) {
      console.error('❌ Error disconnecting from voice channel:', error);
    }
  }, []);

  const toggleMute = useCallback(() => {
    try {
      const newMutedState = webrtcVoiceManager.toggleMute();
      
      setVoiceState(prev => ({
        ...prev,
        isMuted: newMutedState
      }));

      console.log('🎤 Mute toggled:', newMutedState);
    } catch (error) {
      console.error('❌ Error toggling mute:', error);
    }
  }, []);

  const toggleDeafen = useCallback(() => {
    try {
      const newDeafenedState = webrtcVoiceManager.toggleDeafen();
      const newMutedState = webrtcVoiceManager.isMutedState();

      setVoiceState(prev => ({
        ...prev,
        isDeafened: newDeafenedState,
        isMuted: newMutedState
      }));

      console.log('🔇 Deafen toggled:', newDeafenedState);
    } catch (error) {
      console.error('❌ Error toggling deafen:', error);
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    try {
      setVoiceState(prev => ({
        ...prev,
        volume: Math.max(0, Math.min(100, volume))
      }));

      console.log(`🔊 Volume set to: ${volume}%`);
    } catch (error) {
      console.error('❌ Error setting volume:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcVoiceManager.isConnected()) {
        webrtcVoiceManager.disconnectFromChannel();
      }
    };
  }, []);

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
    currentChannelId: voiceState.channelId,
    isConnecting: voiceState.isConnecting
  };
};