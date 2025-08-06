import { useState, useRef, useCallback, useEffect } from 'react';
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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connectToVoiceChannel = useCallback(async (channelId: string) => {
    try {
      // Initialize WebRTC peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Get user media for microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      localStreamRef.current = stream;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Connect to Spacebar voice gateway via WebSocket
      const voiceWsUrl = spacebarClient.config.endpoint.replace('http', 'ws') + '/voice';
      const voiceWs = new WebSocket(voiceWsUrl);
      wsRef.current = voiceWs;

      voiceWs.onopen = () => {
        console.log('Connected to voice gateway');
        
        // Send voice identification
        voiceWs.send(JSON.stringify({
          op: 0, // Voice Identify
          d: {
            channel_id: channelId,
            user_id: spacebarClient.getUser()?.id,
            session_id: Math.random().toString(36).substring(7),
            token: spacebarClient.token
          }
        }));

        setVoiceState(prev => ({
          ...prev,
          channelId,
          isConnected: true
        }));
      };

      voiceWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleVoiceMessage(data);
      };

      voiceWs.onerror = (error) => {
        console.error('Voice WebSocket error:', error);
      };

      voiceWs.onclose = () => {
        console.log('Voice WebSocket closed');
        setVoiceState(prev => ({
          ...prev,
          isConnected: false,
          channelId: null
        }));
      };

      // Set up peer connection event handlers
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && voiceWs.readyState === WebSocket.OPEN) {
          voiceWs.send(JSON.stringify({
            op: 3, // ICE Candidate
            d: event.candidate
          }));
        }
      };

      peerConnection.ontrack = (event) => {
        // Handle incoming audio streams from other users
        console.log('Received remote stream:', event.streams[0]);
      };

    } catch (error) {
      console.error('Failed to connect to voice channel:', error);
      throw error;
    }
  }, []);

  const handleVoiceMessage = useCallback((data: any) => {
    const { op, d } = data;

    switch (op) {
      case 2: // Ready
        console.log('Voice connection ready');
        break;
      case 4: // Session Description
        if (peerConnectionRef.current) {
          peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(d));
        }
        break;
      case 5: // Speaking
        // Update user speaking status
        setVoiceState(prev => ({
          ...prev,
          connectedUsers: prev.connectedUsers.map(user => 
            user.id === d.user_id 
              ? { ...user, isSpeaking: d.speaking }
              : user
          )
        }));
        break;
      case 6: // Heartbeat ACK
        console.log('Voice heartbeat acknowledged');
        break;
    }
  }, []);

  const disconnectFromVoiceChannel = useCallback(async () => {
    try {
      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Release local media stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

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
      
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = !newMutedState;
        });
      }

      setVoiceState(prev => ({
        ...prev,
        isMuted: newMutedState
      }));

      console.log('Mute toggled:', newMutedState);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [voiceState.isMuted]);

  const toggleDeafen = useCallback(async () => {
    try {
      const newDeafenedState = !voiceState.isDeafened;

      setVoiceState(prev => ({
        ...prev,
        isDeafened: newDeafenedState,
        isMuted: newDeafenedState ? true : prev.isMuted // Deafening also mutes
      }));

      console.log('Deafen toggled:', newDeafenedState);
    } catch (error) {
      console.error('Error toggling deafen:', error);
    }
  }, [voiceState.isDeafened]);

  const setVolume = useCallback((volume: number) => {
    try {
      setVoiceState(prev => ({
        ...prev,
        volume: Math.max(0, Math.min(100, volume))
      }));

      // Adjust audio output volume
      if (localStreamRef.current) {
        const audioTracks = localStreamRef.current.getAudioTracks();
        audioTracks.forEach(track => {
          if ('volume' in track) {
            (track as any).volume = volume / 100;
          }
        });
      }

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