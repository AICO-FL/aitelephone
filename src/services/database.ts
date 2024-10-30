import { Pool } from 'pg';
import Redis from 'ioredis';
import { CallSession, Conversation } from '../types';
import { Logger } from './logger';

export class DatabaseService {
  private pool: Pool;
  private redis: Redis;
  private logger: Logger;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_RETRIES = 3;

  constructor(postgresUrl: string, redisUrl: string) {
    this.pool = new Pool({ 
      connectionString: postgresUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        if (times <= this.MAX_RETRIES) {
          return Math.min(times * 50, 2000);
        }
        return null;
      },
      maxRetriesPerRequest: 3,
    });

    this.logger = new Logger();
    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    this.pool.on('error', (err) => {
      this.logger.error('Postgres pool error:', err);
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });
  }

  public async saveSession(session: CallSession): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO call_sessions (id, start_time, end_time, status)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE
         SET end_time = EXCLUDED.end_time,
             status = EXCLUDED.status`,
        [session.id, session.startTime, session.endTime, session.status]
      );

      // Cache session data
      await this.redis.setex(
        `session:${session.id}`,
        this.CACHE_TTL,
        JSON.stringify(session)
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error saving session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async saveConversation(conversation: Conversation): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO conversations 
         (id, session_id, timestamp, user_input, ai_response, audio_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          conversation.id,
          conversation.sessionId,
          conversation.timestamp,
          conversation.userInput,
          conversation.aiResponse,
          conversation.audioUrl,
        ]
      );

      // Cache conversation data
      await this.redis.setex(
        `conversation:${conversation.id}`,
        this.CACHE_TTL,
        JSON.stringify(conversation)
      );

      // Update session's last conversation
      await this.redis.setex(
        `session:${conversation.sessionId}:lastConversation`,
        this.CACHE_TTL,
        JSON.stringify(conversation)
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error saving conversation:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async getSessionConversations(sessionId: string): Promise<Conversation[]> {
    try {
      const cachedData = await this.redis.get(`session:${sessionId}:conversations`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      const result = await this.pool.query(
        `SELECT * FROM conversations 
         WHERE session_id = $1 
         ORDER BY timestamp ASC`,
        [sessionId]
      );

      const conversations = result.rows;
      await this.redis.setex(
        `session:${sessionId}:conversations`,
        this.CACHE_TTL,
        JSON.stringify(conversations)
      );

      return conversations;
    } catch (error) {
      this.logger.error('Error fetching session conversations:', error);
      throw error;
    }
  }

  public async cacheResponse(key: string, response: string): Promise<void> {
    try {
      await this.redis.setex(`response:${key}`, this.CACHE_TTL, response);
    } catch (error) {
      this.logger.error('Error caching response:', error);
      // Don't throw error for cache operations
    }
  }

  public async getCachedResponse(key: string): Promise<string | null> {
    try {
      return await this.redis.get(`response:${key}`);
    } catch (error) {
      this.logger.error('Error getting cached response:', error);
      return null;
    }
  }

  public async getSessionMetrics(sessionId: string): Promise<any> {
    try {
      const result = await this.pool.query(
        `SELECT 
           COUNT(*) as total_conversations,
           AVG(EXTRACT(EPOCH FROM (
             lead(timestamp) OVER (ORDER BY timestamp) - timestamp
           ))) as avg_response_time,
           MIN(timestamp) as session_start,
           MAX(timestamp) as session_end
         FROM conversations 
         WHERE session_id = $1`,
        [sessionId]
      );

      return result.rows[0];
    } catch (error) {
      this.logger.error('Error getting session metrics:', error);
      throw error;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      // Delete old sessions and their conversations
      await this.pool.query(
        `DELETE FROM call_sessions 
         WHERE end_time < NOW() - INTERVAL '30 days'`
      );

      // Cleanup Redis cache
      const keys = await this.redis.keys('session:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      // Check PostgreSQL
      await this.pool.query('SELECT 1');
      
      // Check Redis
      await this.redis.ping();
      
      return true;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    await this.redis.quit();
  }
}