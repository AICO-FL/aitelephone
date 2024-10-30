import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { Logger } from './logger';

interface Connection {
  ws: WebSocket;
  lastPing: number;
  reconnectAttempts: number;
}

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, Connection>;
  private readonly MAX_RECONNECT_ATTEMPTS = 3;
  private readonly PING_INTERVAL = 30000;
  private readonly PING_TIMEOUT = 5000;
  private logger: Logger;

  constructor() {
    super();
    this.connections = new Map();
    this.logger = new Logger();
    this.startHeartbeat();
  }

  public addConnection(id: string, ws: WebSocket): void {
    this.connections.set(id, {
      ws,
      lastPing: Date.now(),
      reconnectAttempts: 0,
    });

    this.setupWebSocketHandlers(id, ws);
  }

  private setupWebSocketHandlers(id: string, ws: WebSocket): void {
    ws.on('pong', () => {
      const conn = this.connections.get(id);
      if (conn) {
        conn.lastPing = Date.now();
      }
    });

    ws.on('close', async () => {
      await this.handleDisconnection(id);
    });

    ws.on('error', async (error) => {
      this.logger.error('WebSocket error', { id, error });
      await this.handleDisconnection(id);
    });
  }

  private async handleDisconnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) return;

    if (conn.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      await this.attemptReconnection(id, conn);
    } else {
      this.emit('connection:failed', id);
      this.connections.delete(id);
    }
  }

  private async attemptReconnection(id: string, conn: Connection): Promise<void> {
    try {
      conn.reconnectAttempts++;
      const backoffTime = Math.pow(2, conn.reconnectAttempts) * 1000;
      
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      const ws = new WebSocket(process.env.WEBSOCKET_URL!);
      this.addConnection(id, ws);
      
      this.emit('connection:reconnected', id);
    } catch (error) {
      this.logger.error('Reconnection failed', { id, error });
      await this.handleDisconnection(id);
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [id, conn] of this.connections) {
        if (now - conn.lastPing > this.PING_INTERVAL) {
          conn.ws.ping();
          
          // タイムアウトチェック
          setTimeout(() => {
            const currentConn = this.connections.get(id);
            if (currentConn && currentConn.lastPing < now) {
              this.handleDisconnection(id);
            }
          }, this.PING_TIMEOUT);
        }
      }
    }, this.PING_INTERVAL);
  }

  public getConnection(id: string): WebSocket | undefined {
    return this.connections.get(id)?.ws;
  }

  public removeConnection(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.ws.close();
      this.connections.delete(id);
    }
  }
}