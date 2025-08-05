// Spacebar Chat client configuration using discord.js (Spacebar is Discord-compatible)
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';

interface SpacebarConfig {
  endpoint: string;
  token?: string;
}

class SpacebarClient {
  private client: Client | null = null;
  private rest: REST | null = null;
  private config: SpacebarConfig;
  private token: string | null = null;

  constructor(config: SpacebarConfig) {
    this.config = config;
  }

  async initialize(token?: string) {
    if (this.client) return this.client;

    console.log('=== INITIALIZING SPACEBAR CLIENT ===');
    console.log('Endpoint:', this.config.endpoint);

    try {
      // Create Discord.js client with voice intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildVoiceStates,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      // Set up REST API for Spacebar endpoint
      if (token || this.config.token) {
        this.token = token || this.config.token!;
        this.rest = new REST({ version: '10' }).setToken(this.token);
        
        // Override the REST API endpoint for Spacebar
        if (this.config.endpoint !== 'https://discord.com/api') {
          // @ts-ignore - Private property override for Spacebar
          this.rest.options.api = this.config.endpoint;
        }
      }

      console.log('✅ Spacebar client initialized successfully');
      return this.client;
    } catch (error) {
      console.error('❌ Failed to initialize Spacebar client:', error);
      throw error;
    }
  }

  async login(token: string) {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    console.log('=== SPACEBAR LOGIN ===');
    console.log('Using token authentication');

    try {
      this.token = token;
      
      // Set up REST API
      this.rest = new REST({ version: '10' }).setToken(token);
      if (this.config.endpoint !== 'https://discord.com/api') {
        // @ts-ignore - Private property override for Spacebar
        this.rest.options.api = this.config.endpoint;
      }

      // Login to Spacebar/Discord gateway
      await this.client.login(token);
      console.log('✅ Login successful');
      return { token };
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  async register(credentials: { email: string; password: string; username: string }) {
    console.log('=== SPACEBAR REGISTER ===');
    console.log('Email:', credentials.email);
    console.log('Username:', credentials.username);

    try {
      // For Spacebar registration, we need to make a direct API call
      if (!this.rest) {
        this.rest = new REST({ version: '10' });
        if (this.config.endpoint !== 'https://discord.com/api') {
          // @ts-ignore - Private property override for Spacebar
          this.rest.options.api = this.config.endpoint;
        }
      }

      const response = await fetch(`${this.config.endpoint}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          username: credentials.username,
          consent: true,
          date_of_birth: '2000-01-01' // Required by some Spacebar instances
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Registration failed: ${error}`);
      }

      const result = await response.json();
      console.log('✅ Registration successful');
      return result;
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  getRest() {
    if (!this.rest) {
      throw new Error('REST client not initialized. Login first.');
    }
    return this.rest;
  }

  async disconnect() {
    if (this.client) {
      console.log('=== DISCONNECTING SPACEBAR CLIENT ===');
      this.client.destroy();
      this.client = null;
      this.rest = null;
      this.token = null;
    }
  }
}

// Default configuration - you'll need to update this with your Spacebar server URL
const DEFAULT_CONFIG: SpacebarConfig = {
  endpoint: process.env.SPACEBAR_ENDPOINT || 'https://api.spacebar.chat' // Update this to your server
};

export const spacebarClient = new SpacebarClient(DEFAULT_CONFIG);
export { SpacebarClient };
export type { SpacebarConfig };