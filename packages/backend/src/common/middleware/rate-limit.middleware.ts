import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { createClient, RedisClientType } from 'redis'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyPrefix?: string // Redis key prefix
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private redisClient: RedisClientType | null = null
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rate-limit',
      ...config,
    }
    this.initRedis()
  }

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
      this.redisClient = createClient({ url: redisUrl })

      this.redisClient.on('error', err => {
        console.error('Redis Client Error:', err)
      })

      await this.redisClient.connect()
    } catch (error) {
      console.error('Failed to connect to Redis:', error)
      // Fallback to in-memory rate limiting if Redis is not available
      this.redisClient = null
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Get identifier (IP address or user ID)
      const identifier = this.getIdentifier(req)
      const key = `${this.config.keyPrefix}:${identifier}`

      if (!this.redisClient) {
        // If Redis is not available, allow the request
        return next()
      }

      // Get current count
      const current = await this.redisClient.get(key)
      const count = current ? parseInt(current, 10) : 0

      // Calculate reset time
      const ttl = await this.redisClient.ttl(key)
      const resetTime = ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + this.config.windowMs

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.maxRequests.toString())
      res.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, this.config.maxRequests - count - 1).toString()
      )
      res.setHeader('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString())

      // Check if limit exceeded
      if (count >= this.config.maxRequests) {
        res.status(429).json({
          statusCode: 429,
          message: 'Too many requests, please try again later.',
          error: 'Too Many Requests',
        })
        return
      }

      // Increment counter
      if (count === 0) {
        // First request in window
        await this.redisClient.set(key, '1', {
          PX: this.config.windowMs,
        })
      } else {
        // Subsequent request
        await this.redisClient.incr(key)
      }

      next()
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      // On error, allow the request to proceed
      next()
    }
  }

  private getIdentifier(req: Request): string {
    // Try to get user ID from request (if authenticated)
    const user = (req as any).user
    if (user && user.id) {
      return `user:${user.id}`
    }

    // Fall back to IP address
    const forwarded = req.headers['x-forwarded-for']
    const ip = forwarded
      ? Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0]
      : req.socket.remoteAddress

    return `ip:${ip}`
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit()
    }
  }
}

// Factory function to create rate limit middleware with specific config
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return new RateLimitMiddleware(config)
}
