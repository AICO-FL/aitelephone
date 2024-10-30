import Redis from 'ioredis';
import { Logger } from './logger';

export class CacheManager {
  private redis: Redis;
  private logger: Logger;
  private readonly DEFAULT_TTL = 3600; // 1時間

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.logger = new Logger();

    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.redis.on('error', (error) => {
      this.logger.error('Redis error', { error });
    });
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Cache get failed', { error, key });
      return null;
    }
  }

  public async set(
    key: string,
    value: any,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.set(key, serialized, 'EX', ttl);
    } catch (error) {
      this.logger.error('Cache set failed', { error, key });
    }
  }

  public async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error('Cache delete failed', { error, key });
    }
  }

  public async increment(key: string): Promise<number> {
    try {
      return await this.redis.incr(key);
    } catch (error) {
      this.logger.error('Cache increment failed', { error, key });
      return 0;
    }
  }

  public async setHash(
    key: string,
    field: string,
    value: any,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis
        .multi()
        .hset(key, field, serialized)
        .expire(key, ttl)
        .exec();
    } catch (error) {
      this.logger.error('Cache hash set failed', { error, key, field });
    }
  }

  public async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const data = await this.redis.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error('Cache hash get failed', { error, key, field });
      return null;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      const keys = await this.redis.keys('cache:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      this.logger.error('Cache cleanup failed', { error });
    }
  }
}