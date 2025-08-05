// Spacebar Voice Channel Hook - redirects to new implementation
import { useSpacebarVoice } from './useSpacebarVoice';

export const useVoiceChannel = (channelId: string | null) => {
  const spacebar = useSpacebarVoice();
  
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