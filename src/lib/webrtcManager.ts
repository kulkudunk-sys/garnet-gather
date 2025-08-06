interface VoiceUser {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened: boolean;
}

interface VoiceConnection {
  userId: string;
  peerConnection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  dataChannel?: RTCDataChannel;
}

export class WebRTCVoiceManager {
  private connections = new Map<string, VoiceConnection>();
  private localStream: MediaStream | null = null;
  private isListening = false;
  private onUsersUpdate?: (users: VoiceUser[]) => void;
  private onConnectionStateChange?: (isConnected: boolean) => void;
  private currentChannelId: string | null = null;
  private isMuted = false;
  private isDeafened = false;

  constructor() {
    console.log('🎤 WebRTC Voice Manager initialized');
  }

  async initializeMedia(): Promise<void> {
    try {
      console.log('🎤 Requesting microphone access...');
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('✅ Microphone access granted');
      
      // Add speaking detection
      this.setupSpeakingDetection();
    } catch (error) {
      console.error('❌ Failed to get microphone access:', error);
      throw error;
    }
  }

  private setupSpeakingDetection(): void {
    if (!this.localStream) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(this.localStream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    microphone.connect(analyser);
    analyser.fftSize = 256;

    const checkSpeaking = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const isSpeaking = average > 10 && !this.isMuted;
      
      // Broadcast speaking state to all connections
      this.connections.forEach(connection => {
        if (connection.dataChannel?.readyState === 'open') {
          connection.dataChannel.send(JSON.stringify({
            type: 'speaking',
            isSpeaking
          }));
        }
      });

      requestAnimationFrame(checkSpeaking);
    };

    checkSpeaking();
  }

  async connectToChannel(channelId: string, userId: string, username: string): Promise<void> {
    console.log('🔊 Connecting to voice channel:', channelId);
    
    try {
      if (!this.localStream) {
        await this.initializeMedia();
      }

      this.currentChannelId = channelId;
      
      // Simulate connection success
      console.log('✅ Connected to voice channel');
      this.onConnectionStateChange?.(true);
      
      // Add self to users list
      this.updateUsers([{
        id: userId,
        username,
        isMuted: this.isMuted,
        isSpeaking: false,
        isDeafened: this.isDeafened
      }]);

    } catch (error) {
      console.error('❌ Failed to connect to voice channel:', error);
      throw error;
    }
  }

  async disconnectFromChannel(): Promise<void> {
    console.log('🔇 Disconnecting from voice channel');
    
    // Close all peer connections
    this.connections.forEach(connection => {
      connection.peerConnection.close();
      if (connection.dataChannel) {
        connection.dataChannel.close();
      }
    });
    this.connections.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.currentChannelId = null;
    this.onConnectionStateChange?.(false);
    this.updateUsers([]);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }

    console.log(`🎤 Microphone ${this.isMuted ? 'muted' : 'unmuted'}`);
    return this.isMuted;
  }

  toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    
    // If deafening, also mute
    if (this.isDeafened) {
      this.isMuted = true;
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
    }

    console.log(`🔇 Audio ${this.isDeafened ? 'deafened' : 'undeafened'}`);
    return this.isDeafened;
  }

  private updateUsers(users: VoiceUser[]): void {
    this.onUsersUpdate?.(users);
  }

  setOnUsersUpdate(callback: (users: VoiceUser[]) => void): void {
    this.onUsersUpdate = callback;
  }

  setOnConnectionStateChange(callback: (isConnected: boolean) => void): void {
    this.onConnectionStateChange = callback;
  }

  getCurrentChannelId(): string | null {
    return this.currentChannelId;
  }

  isMutedState(): boolean {
    return this.isMuted;
  }

  isDeafenedState(): boolean {
    return this.isDeafened;
  }

  isConnected(): boolean {
    return this.currentChannelId !== null;
  }

  // WebRTC peer connection methods (for future P2P implementation)
  private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(config);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    return peerConnection;
  }
}

// Singleton instance
export const webrtcVoiceManager = new WebRTCVoiceManager();