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
  public config: SpacebarConfig;
  public token: string | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sequenceNumber: number | null = null;
  private sessionId: string | null = null;
  private user: User | null = null;
  private guilds: Guild[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();

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

  async disconnect(): Promise<void> {
    try {
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
}

// Default configuration - you'll need to update this with your Spacebar server URL
const DEFAULT_CONFIG: SpacebarConfig = {
  endpoint: 'https://api.spacebar.chat' // Update this to your server
};

export const spacebarClient = new SpacebarClient(DEFAULT_CONFIG);
export { SpacebarClient };
export type { SpacebarConfig };