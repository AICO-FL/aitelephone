import Redis from 'ioredis';
import { Logger } from './logger';

interface RateLimitConfig {
  points: number;      // 許可されるリクエスト数
  duration: number;    // 期間（秒）
  blockDuration?: number; // ブロック期間（秒）
}

export class RateLimiter {
  private redis: Redis;
  private logger: Logger;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.logger = new Logger();
  }

  public async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Math.floor(Date.now() / 1000);
    const keyPrefix = `ratelimit:${key}`;

    try {
      // トランザクションで実行
      const results = await this.redis
        .multi()
        .zremrangebyscore(`${keyPrefix}:requests`, 0, now - config.duration)
        .zadd(`${keyPrefix}:requests`, now, `${now}:${Math.random()}`)
        .zcard(`${keyPrefix}:requests`)
        .zrange(`${keyPrefix}:requests`, 0, 0)
        .exec();

      if (!results) {
        throw new Error('Redis transaction failed');
      }

      const requestCount = results[2]?.[1] as number;
      const oldestRequest = results[3]?.[1] as string[];
      const resetTime = oldestRequest.length 
        ? parseInt(oldestRequest[0].split(':')[0]) + config.duration
        : now + config.duration;

      const remaining = Math.max(0, config.points - requestCount);
      const allowed = requestCount <= config.points;

      if (!allowed && config.blockDuration) {
        await this.redis.set(
          `${keyPrefix}:blocked`,
          '1',
          'EX',
          config.blockDuration
        );
      }

      return { allowed, remaining, resetTime };
    } catch (error) {
      this.logger.error('Rate limit check failed', { error, key });
      // エラー時は制限をかけない
      return { allowed: true, remaining: 1, resetTime: now + config.duration };
    }
  }

  public async isBlocked(key: string): Promise<boolean> {
    try {
      const blocked = await this.redis.get(`ratelimit:${key}:blocked`);
      return !!blocked;
    } catch (error) {
      this.logger.error('Block check failed', { error, key });
      return false;
    }
  }

  public async reset(key: string): Promise<void> {
    const keyPrefix = `ratelimit:${key}`;
    try {
      await this.redis
        .multi()
        .del(`${keyPrefix}:requests`)
        .del(`${keyPrefix}:blocked`)
        .exec();
    } catch (error) {
      this.logger.error('Rate limit reset failed', { error, key });
    }
  }
}