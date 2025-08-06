// WebRTC Voice Channel Hook
import { useEffect } from 'react';
import { useWebRTCVoice } from './useWebRTCVoice';

export const useVoiceChannel = (channelId: string | null) => {
  const webrtc = useWebRTCVoice();
  
  // Auto-connect when channel ID is provided
  useEffect(() => {
    if (channelId && !webrtc.isConnected && !webrtc.isConnecting) {
      console.log('🔊 Auto-connecting to voice channel:', channelId);
      webrtc.connectToVoiceChannel(channelId).catch(error => {
        console.error('❌ Auto-connect failed:', error);
      });
    }
  }, [channelId, webrtc.isConnected, webrtc.isConnecting, webrtc.connectToVoiceChannel]);
  
  return {
    isConnected: webrtc.isConnected,
    isRecording: webrtc.isRecording,
    isMuted: webrtc.isMuted,
    connectedUsers: webrtc.connectedUsers,
    connectToVoiceChannel: () => channelId ? webrtc.connectToVoiceChannel(channelId) : Promise.resolve(),
    disconnectFromVoiceChannel: webrtc.disconnectFromVoiceChannel,
    toggleMute: webrtc.toggleMute,
    localStream: null, // WebRTC manager handles this internally
    isSpeaking: false, // Will be implemented with speaking detection
    isConnecting: webrtc.isConnecting
  };
};