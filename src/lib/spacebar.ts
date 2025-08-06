// Browser-compatible Spacebar Chat client using WebSockets
interface SpacebarConfig {
  endpoint: string;
  token?: string;
}

interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

interface Guild {
  id: string;
  name: string;
  channels: Channel[];
}

interface Channel {
  id: string;
  name: string;
  type: number; // 0 = text, 2 = voice
  guild_id: string;
}

interface Message {
  id: string;
  content: string;
  author: User;
  channel_id: string;
  timestamp: string;
}

class SpacebarClient {
  private ws: WebSocket | null = null;
  private voiceWs: WebSocket | null = null;
  public config: SpacebarConfig;
  public token: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private voiceHeartbeatInterval: NodeJS.Timeout | null = null;
  private sequenceNumber: number | null = null;
  private sessionId: string | null = null;
  private voiceSessionId: string | null = null;
  private user: User | null = null;
  private guilds: Guild[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();
  private voiceState: any = null;

  constructor(config: SpacebarConfig) {
    this.config = config;
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  async initialize(token?: string): Promise<boolean> {
    try {
      if (!token && !this.config.token) {
        console.log('No token provided for Spacebar client initialization');
        return false;
      }

      this.token = token || this.config.token!;
      console.log('Spacebar client initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Spacebar client:', error);
      return false;
    }
  }

  async login(token: string): Promise<{ token: string }> {
    try {
      this.token = token;
      
      // Connect to Spacebar WebSocket gateway
      const gatewayUrl = this.config.endpoint.replace('http', 'ws') + '/gateway';
      this.ws = new WebSocket(gatewayUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to Spacebar gateway');
        this.identify();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('Spacebar WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from Spacebar gateway');
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
        }
      };

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Login timeout'));
        }, 10000);

        this.on('ready', () => {
          clearTimeout(timeout);
          resolve({ token });
        });
      });
    } catch (error) {
      console.error('Failed to login to Spacebar:', error);
      throw error;
    }
  }

  private identify() {
    if (!this.ws || !this.token) return;
    
    const identifyPayload = {
      op: 2,
      d: {
        token: this.token,
        properties: {
          os: 'browser',
          browser: 'spacebar-client',
          device: 'spacebar-client'
        },
        intents: 513 // GUILDS + GUILD_VOICE_STATES
      }
    };
    
    this.ws.send(JSON.stringify(identifyPayload));
  }

  private handleMessage(data: any) {
    const { op, d, s, t } = data;
    
    if (s) {
      this.sequenceNumber = s;
    }

    switch (op) {
      case 10: // Hello
        this.startHeartbeat(d.heartbeat_interval);
        break;
      case 0: // Dispatch
        this.handleDispatch(t, d);
        break;
      case 1: // Heartbeat
        this.sendHeartbeat();
        break;
      case 11: // Heartbeat ACK
        console.log('Heartbeat acknowledged');
        break;
    }
  }

  private handleDispatch(type: string, data: any) {
    switch (type) {
      case 'READY':
        this.sessionId = data.session_id;
        this.user = data.user;
        this.guilds = data.guilds || [];
        this.emit('ready');
        break;
      case 'GUILD_CREATE':
        this.guilds.push(data);
        this.emit('guildCreate', data);
        break;
      case 'MESSAGE_CREATE':
        this.emit('messageCreate', data);
        break;
      case 'VOICE_STATE_UPDATE':
        this.emit('voiceStateUpdate', data);
        break;
      case 'VOICE_SERVER_UPDATE':
        this.emit('voiceServerUpdate', data);
        break;
    }
  }

  private startHeartbeat(interval: number) {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }

  private sendHeartbeat() {
    if (!this.ws) return;
    
    const heartbeatPayload = {
      op: 1,
      d: this.sequenceNumber
    };
    
    this.ws.send(JSON.stringify(heartbeatPayload));
  }

  async register(credentials: { email: string; password: string; username: string }): Promise<any> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      console.log('Successfully registered to Spacebar');
      return data;
    } catch (error) {
      console.error('Failed to register to Spacebar:', error);
      throw error;
    }
  }

  getUser(): User | null {
    return this.user;
  }

  getGuilds(): Guild[] {
    return this.guilds;
  }

  async connectToVoiceChannel(guildId: string, channelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Send voice state update to main gateway
        if (!this.ws) {
          throw new Error('Not connected to gateway');
        }

        const voiceStateUpdate = {
          op: 4,
          d: {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: false,
            self_deaf: false
          }
        };

        this.ws.send(JSON.stringify(voiceStateUpdate));

        // Listen for voice server update
        const handleVoiceServerUpdate = (data: any) => {
          if (data.guild_id === guildId) {
            this.connectToVoiceGateway(data.endpoint, data.token, guildId, channelId)
              .then(() => resolve())
              .catch(reject);
          }
        };

        this.on('voiceServerUpdate', handleVoiceServerUpdate);

        // Timeout after 10 seconds
        setTimeout(() => {
          reject(new Error('Voice connection timeout'));
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  private async connectToVoiceGateway(endpoint: string, token: string, guildId: string, channelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing voice connection
        if (this.voiceWs) {
          this.voiceWs.close();
        }

        const voiceGatewayUrl = `wss://${endpoint}`;
        this.voiceWs = new WebSocket(voiceGatewayUrl);

        this.voiceWs.onopen = () => {
          console.log('Connected to voice gateway');
          
          // Send voice identify
          const identify = {
            op: 0,
            d: {
              server_id: guildId,
              user_id: this.user?.id,
              session_id: this.sessionId,
              token: token
            }
          };

          this.voiceWs!.send(JSON.stringify(identify));
        };

        this.voiceWs.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleVoiceMessage(data, resolve, reject);
        };

        this.voiceWs.onerror = (error) => {
          console.error('Voice WebSocket error:', error);
          reject(error);
        };

        this.voiceWs.onclose = () => {
          console.log('Voice WebSocket closed');
          if (this.voiceHeartbeatInterval) {
            clearInterval(this.voiceHeartbeatInterval);
            this.voiceHeartbeatInterval = null;
          }
          this.emit('voiceDisconnected');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleVoiceMessage(data: any, resolve?: () => void, reject?: (error: any) => void) {
    const { op, d } = data;

    switch (op) {
      case 2: // Ready
        console.log('Voice ready');
        this.voiceSessionId = d.session_id;
        this.startVoiceHeartbeat(d.heartbeat_interval);
        this.emit('voiceReady', d);
        if (resolve) resolve();
        break;
      case 3: // Heartbeat
        this.sendVoiceHeartbeat();
        break;
      case 4: // Session Description
        this.emit('voiceSessionDescription', d);
        break;
      case 5: // Speaking
        this.emit('voiceSpeaking', d);
        break;
      case 6: // Heartbeat ACK
        console.log('Voice heartbeat acknowledged');
        break;
      case 8: // Hello
        this.startVoiceHeartbeat(d.heartbeat_interval);
        break;
    }
  }

  private startVoiceHeartbeat(interval: number) {
    if (this.voiceHeartbeatInterval) {
      clearInterval(this.voiceHeartbeatInterval);
    }
    
    this.voiceHeartbeatInterval = setInterval(() => {
      this.sendVoiceHeartbeat();
    }, interval);
  }

  private sendVoiceHeartbeat() {
    if (!this.voiceWs) return;
    
    const heartbeat = {
      op: 3,
      d: Date.now()
    };
    
    this.voiceWs.send(JSON.stringify(heartbeat));
  }

  async disconnectFromVoiceChannel(): Promise<void> {
    try {
      // Send voice state update to disconnect
      if (this.ws) {
        const voiceStateUpdate = {
          op: 4,
          d: {
            guild_id: null,
            channel_id: null,
            self_mute: false,
            self_deaf: false
          }
        };

        this.ws.send(JSON.stringify(voiceStateUpdate));
      }

      // Close voice WebSocket
      if (this.voiceWs) {
        this.voiceWs.close();
        this.voiceWs = null;
      }

      // Clear voice heartbeat
      if (this.voiceHeartbeatInterval) {
        clearInterval(this.voiceHeartbeatInterval);
        this.voiceHeartbeatInterval = null;
      }

      this.voiceSessionId = null;
      this.voiceState = null;
      
      console.log('Disconnected from voice channel');
      this.emit('voiceDisconnected');
    } catch (error) {
      console.error('Error disconnecting from voice channel:', error);
    }
  }

  setVoiceState(muted: boolean, deafened: boolean) {
    this.voiceState = { muted, deafened };
    
    if (this.voiceWs) {
      const speaking = {
        op: 5,
        d: {
          speaking: muted ? 0 : 1,
          delay: 0,
          ssrc: 0
        }
      };
      
      this.voiceWs.send(JSON.stringify(speaking));
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.disconnectFromVoiceChannel();
      
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      this.token = null;
      this.sessionId = null;
      this.user = null;
      this.guilds = [];
      console.log('Spacebar client disconnected');
    } catch (error) {
      console.error('Error disconnecting Spacebar client:', error);
    }
  }

  // Public method to set a mock user for development
  setMockUser(user: { id: string; username: string; discriminator: string; avatar?: string | null }): void {
    this.user = user;
    console.log('Mock user set in Spacebar client:', user.username);
  }
}

// Default configuration - you'll need to update this with your Spacebar server URL
const DEFAULT_CONFIG: SpacebarConfig = {
  endpoint: 'http://localhost:3001' // Update this to your Spacebar server
};

export const spacebarClient = new SpacebarClient(DEFAULT_CONFIG);
export { SpacebarClient };
export type { SpacebarConfig };