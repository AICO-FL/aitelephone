import { Vonage } from '@vonage/server-sdk';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { VonageConfig } from '../types';
import { Logger } from './logger';

interface WebSocketConnection {
  ws: WebSocket;
  callId: string;
  lastActivity: number;
  silenceStart?: number;
}

export class VonageService extends EventEmitter {
  private vonage: Vonage;
  private wss: WebSocketServer;
  private connections: Map<string, WebSocketConnection>;
  private logger: Logger;
  private readonly AUDIO_FRAME_SIZE = 640; // 16kHz sample rate
  private readonly MAX_SILENCE_DURATION = 10000; // 10 seconds
  private readonly ACTIVITY_TIMEOUT = 30000; // 30 seconds
  private readonly RECONNECT_ATTEMPTS = 3;

  constructor(config: VonageConfig) {
    super();
    this.vonage = new Vonage({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      applicationId: config.applicationId,
      privateKey: config.privateKey,
    });

    this.connections = new Map();
    this.logger = new Logger();
    this.wss = new WebSocketServer({ port: 8080 });
    this.setupWebSocket();
    this.startConnectionMonitoring();
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      let connectionInfo: WebSocketConnection | undefined;

      try {
        const callId = this.extractCallId(req.url);
        connectionInfo = {
          ws,
          callId,
          lastActivity: Date.now(),
        };
        this.connections.set(callId, connectionInfo);
        this.logger.info('New WebSocket connection established', { callId });

        this.setupWebSocketHandlers(ws, connectionInfo);
      } catch (error) {
        this.logger.error('Error in WebSocket connection setup', { error });
        ws.close(1011, 'Internal Server Error');
      }
    });
  }

  private setupWebSocketHandlers(ws: WebSocket, connection: WebSocketConnection) {
    let audioBuffer: Buffer[] = [];

    ws.on('message', async (data) => {
      try {
        connection.lastActivity = Date.now();

        if (data instanceof Buffer) {
          await this.handleAudioData(data, connection);
          this.checkForSilence(data, connection);
        } else {
          await this.handleJsonMessage(data.toString(), connection);
        }
      } catch (error) {
        this.logger.error('Error processing WebSocket message', {
          error,
          callId: connection.callId,
        });
      }
    });

    ws.on('close', (code, reason) => {
      this.logger.info('WebSocket connection closed', {
        callId: connection.callId,
        code,
        reason,
      });
      this.connections.delete(connection.callId);
      this.emit('websocket:disconnected', connection.callId);
    });

    ws.on('error', (error) => {
      this.logger.error('WebSocket error', {
        error,
        callId: connection.callId,
      });
      this.handleWebSocketError(error, connection);
    });

    // Send initial configuration
    ws.send(JSON.stringify({
      event: 'websocket:connected',
      'content-type': 'audio/l16;rate=16000',
      language: 'ja-JP',
    }));
  }

  private async handleAudioData(audioData: Buffer, connection: WebSocketConnection) {
    const audioLevel = this.calculateAudioLevel(audioData);
    
    // Emit audio level for monitoring
    this.emit('audio:level', {
      callId: connection.callId,
      level: audioLevel,
    });

    // Process audio in frames
    const frames = this.splitAudioIntoFrames(audioData);
    for (const frame of frames) {
      this.emit('audio', frame, connection.callId);
    }
  }

  private calculateAudioLevel(audioData: Buffer): number {
    const samples = new Int16Array(audioData.buffer);
    let sum = 0;
    
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    
    return sum / samples.length;
  }

  private splitAudioIntoFrames(audioData: Buffer): Buffer[] {
    const frames: Buffer[] = [];
    for (let i = 0; i < audioData.length; i += this.AUDIO_FRAME_SIZE) {
      const frame = audioData.slice(i, i + this.AUDIO_FRAME_SIZE);
      if (frame.length === this.AUDIO_FRAME_SIZE) {
        frames.push(frame);
      }
    }
    return frames;
  }

  private checkForSilence(audioData: Buffer, connection: WebSocketConnection) {
    const audioLevel = this.calculateAudioLevel(audioData);
    const SILENCE_THRESHOLD = 100;

    if (audioLevel < SILENCE_THRESHOLD) {
      if (!connection.silenceStart) {
        connection.silenceStart = Date.now();
      } else if (Date.now() - connection.silenceStart > this.MAX_SILENCE_DURATION) {
        this.handleLongSilence(connection);
      }
    } else {
      connection.silenceStart = undefined;
    }
  }

  private async handleLongSilence(connection: WebSocketConnection) {
    this.logger.info('Long silence detected, ending call', {
      callId: connection.callId,
    });
    
    try {
      await this.sendMessage(connection.ws, {
        event: 'call:ending',
        reason: 'silence_timeout',
      });
      
      await this.terminateCall(connection.callId);
    } catch (error) {
      this.logger.error('Error handling long silence', {
        error,
        callId: connection.callId,
      });
    }
  }

  private startConnectionMonitoring() {
    setInterval(() => {
      const now = Date.now();
      
      for (const [callId, connection] of this.connections) {
        if (now - connection.lastActivity > this.ACTIVITY_TIMEOUT) {
          this.logger.warn('Connection timeout detected', { callId });
          this.handleConnectionTimeout(connection);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private async handleConnectionTimeout(connection: WebSocketConnection) {
    try {
      await this.terminateCall(connection.callId);
      connection.ws.close(1000, 'Connection timeout');
    } catch (error) {
      this.logger.error('Error handling connection timeout', {
        error,
        callId: connection.callId,
      });
    }
  }

  private async handleWebSocketError(error: Error, connection: WebSocketConnection) {
    this.emit('websocket:error', {
      callId: connection.callId,
      error: error.message,
    });

    if (this.isRetryableError(error)) {
      await this.attemptReconnection(connection);
    } else {
      await this.terminateCall(connection.callId);
    }
  }

  private isRetryableError(error: Error): boolean {
    return error.message.includes('ECONNRESET') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('connection lost');
  }

  private async attemptReconnection(connection: WebSocketConnection) {
    for (let attempt = 1; attempt <= this.RECONNECT_ATTEMPTS; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        
        const newWs = new WebSocket(`${process.env.BASE_URL}/socket`);
        connection.ws = newWs;
        this.setupWebSocketHandlers(newWs, connection);
        
        this.logger.info('Successfully reconnected WebSocket', {
          callId: connection.callId,
          attempt,
        });
        return;
      } catch (error) {
        this.logger.error('Reconnection attempt failed', {
          error,
          attempt,
          callId: connection.callId,
        });
      }
    }

    await this.terminateCall(connection.callId);
  }

  private extractCallId(url: string | undefined): string {
    const match = url?.match(/\/calls\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid WebSocket URL: missing call ID');
    }
    return match[1];
  }

  private async sendMessage(ws: WebSocket, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      ws.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  public async sendAudioToCall(callId: string, audioBuffer: Buffer): Promise<void> {
    const connection = this.connections.get(callId);
    if (!connection) {
      throw new Error(`No active connection for call ${callId}`);
    }

    try {
      const frames = this.splitAudioIntoFrames(audioBuffer);
      
      for (const frame of frames) {
        await new Promise<void>((resolve, reject) => {
          connection.ws.send(frame, (error) => {
            if (error) reject(error);
            else resolve();
          });
          // Add small delay to prevent overwhelming the socket
          setTimeout(resolve, 18);
        });
      }
    } catch (error) {
      this.logger.error('Error sending audio to call', {
        error,
        callId,
      });
      throw error;
    }
  }

  public async terminateCall(callId: string): Promise<void> {
    try {
      await this.vonage.voice.updateCall(callId, { action: 'hangup' });
      
      const connection = this.connections.get(callId);
      if (connection) {
        connection.ws.close(1000, 'Call terminated');
        this.connections.delete(callId);
      }
      
      this.emit('call:terminated', callId);
    } catch (error) {
      this.logger.error('Error terminating call', {
        error,
        callId,
      });
      throw error;
    }
  }
}</content>