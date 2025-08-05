import { useState, useEffect, useCallback, useRef } from 'react';
import { spacebarClient } from '@/lib/spacebar';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';

interface VoiceUser {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
}

interface VoiceChannelState {
  channelId: string | null;
  connected: boolean;
  users: VoiceUser[];
  isRecording: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  volume: number;
}

export const useSpacebarVoice = () => {
  const [voiceState, setVoiceState] = useState<VoiceChannelState>({
    channelId: null,
    connected: false,
    users: [],
    isRecording: false,
    isMuted: false,
    isDeafened: false,
    volume: 100
  });

  const voiceConnectionRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<any>(null);

  // Connect to voice channel
  const connectToVoiceChannel = useCallback(async (channelId: string) => {
    try {
      console.log('=== CONNECTING TO SPACEBAR VOICE CHANNEL ===');
      console.log('Channel ID:', channelId);

      const client = spacebarClient.getClient();
      
      // Get the channel
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isVoiceBased()) {
        throw new Error('Invalid voice channel');
      }

      // Get the guild ID from the channel
      const guildId = channel.guild.id;

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      localStreamRef.current = stream;

      // Create voice connection using @discordjs/voice
      const connection = joinVoiceChannel({
        channelId: channelId,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfMute: voiceState.isMuted,
        selfDeaf: voiceState.isDeafened
      });

      voiceConnectionRef.current = connection;

      // Set up connection events
      connection.on(VoiceConnectionStatus.Ready, () => {
        console.log('✅ Voice connection is ready!');
        setVoiceState(prev => ({
          ...prev,
          connected: true,
          isRecording: true
        }));
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log('❌ Voice connection disconnected');
        setVoiceState(prev => ({
          ...prev,
          connected: false,
          isRecording: false
        }));
      });

      // Create audio player for local stream
      const player = createAudioPlayer();
      audioPlayerRef.current = player;

      // Subscribe the connection to the audio player
      connection.subscribe(player);

      // Convert MediaStream to audio resource (this is simplified)
      // In a real implementation, you'd need to convert the stream properly
      console.log('Local audio stream ready');

      // Monitor voice state changes for users in the channel
      client.on('voiceStateUpdate', (oldState, newState) => {
        if (newState.channelId === channelId) {
          // User joined
          if (newState.member && !oldState.channelId) {
            console.log('User joined voice:', newState.member.user.username);
            setVoiceState(prev => ({
              ...prev,
              users: [...prev.users.filter(u => u.id !== newState.member!.id), {
                id: newState.member!.id,
                username: newState.member!.user.username,
                isMuted: newState.mute || false,
                isSpeaking: false,
                isDeafened: newState.deaf || false
              }]
            }));
          }
          
          // User updated
          if (newState.member && oldState.channelId === channelId) {
            console.log('User updated:', newState.member.user.username);
            setVoiceState(prev => ({
              ...prev,
              users: prev.users.map(u => 
                u.id === newState.member!.id 
                  ? { ...u, isMuted: newState.mute || false, isDeafened: newState.deaf || false }
                  : u
              )
            }));
          }
        }
        
        // User left
        if (oldState.channelId === channelId && newState.channelId !== channelId) {
          if (oldState.member) {
            console.log('User left voice:', oldState.member.user.username);
            setVoiceState(prev => ({
              ...prev,
              users: prev.users.filter(u => u.id !== oldState.member!.id)
            }));
          }
        }
      });

      setVoiceState(prev => ({
        ...prev,
        channelId
      }));

      console.log('✅ Successfully initiated voice channel connection');
    } catch (error) {
      console.error('❌ Failed to connect to voice channel:', error);
      throw error;
    }
  }, [voiceState.isMuted, voiceState.isDeafened]);

  // Disconnect from voice channel
  const disconnectFromVoiceChannel = useCallback(async () => {
    try {
      console.log('=== DISCONNECTING FROM VOICE CHANNEL ===');

      if (voiceConnectionRef.current) {
        voiceConnectionRef.current.destroy();
        voiceConnectionRef.current = null;
      }

      if (audioPlayerRef.current) {
        audioPlayerRef.current.stop();
        audioPlayerRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }

      setVoiceState(prev => ({
        ...prev,
        channelId: null,
        connected: false,
        users: [],
        isRecording: false
      }));

      console.log('✅ Disconnected from voice channel');
    } catch (error) {
      console.error('❌ Error disconnecting from voice channel:', error);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    try {
      const newMutedState = !voiceState.isMuted;
      
      if (voiceConnectionRef.current) {
        // Update voice connection state
        voiceConnectionRef.current.setSelfMute(newMutedState);
      }

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

  // Toggle deafen
  const toggleDeafen = useCallback(async () => {
    try {
      const newDeafenedState = !voiceState.isDeafened;
      
      if (voiceConnectionRef.current) {
        voiceConnectionRef.current.setSelfDeaf(newDeafenedState);
      }

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

  // Set volume
  const setVolume = useCallback(async (volume: number) => {
    try {
      if (audioPlayerRef.current) {
        // Volume control would need to be implemented at the audio level
        console.log('Setting volume to:', volume);
      }

      setVoiceState(prev => ({
        ...prev,
        volume
      }));
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
    isConnected: voiceState.connected,
    connectedUsers: voiceState.users,
    isMuted: voiceState.isMuted,
    isRecording: voiceState.isRecording,
    currentChannelId: voiceState.channelId
  };
};