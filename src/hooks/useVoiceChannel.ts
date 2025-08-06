// Spacebar Voice Channel Hook - redirects to new implementation
import { useEffect } from 'react';
import { useSpacebarVoice } from './useSpacebarVoice';

export const useVoiceChannel = (channelId: string | null) => {
  const spacebar = useSpacebarVoice();
  
  // Auto-connect when channel ID is provided
  useEffect(() => {
    if (channelId && !spacebar.isConnected) {
      console.log('Auto-connecting to voice channel:', channelId);
      spacebar.connectToVoiceChannel(channelId).catch(error => {
        console.error('Auto-connect failed:', error);
      });
    }
  }, [channelId, spacebar.isConnected, spacebar.connectToVoiceChannel]);
  
  return {
    isConnected: spacebar.isConnected,
    isRecording: spacebar.isRecording,
    isMuted: spacebar.isMuted,
    connectedUsers: spacebar.connectedUsers,
    connectToVoiceChannel: () => channelId ? spacebar.connectToVoiceChannel(channelId) : Promise.resolve(),
    disconnectFromVoiceChannel: spacebar.disconnectFromVoiceChannel,
    toggleMute: spacebar.toggleMute,
    localStream: null, // Not exposed in new implementation
    isSpeaking: false // Not implemented yet
  };
};