import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, RedisClientType } from 'redis'

export interface SessionData {
  userId: string
  email: string
  role: string
  createdAt: number
  lastActivity: number
}

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name)
  private redisClient: RedisClientType | null = null
  private readonly SESSION_TTL = 24 * 60 * 60 // 24 hours in seconds
  private readonly SESSION_PREFIX = 'session:'

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.initRedis()
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit()
    }
  }

  private async initRedis() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379'
      this.redisClient = createClient({ url: redisUrl })

      this.redisClient.on('error', err => {
        this.logger.error('Redis Session Client Error:', err)
      })

      await this.redisClient.connect()
      this.logger.log('Redis session store connected successfully')
    } catch (error) {
      this.logger.error('Failed to connect to Redis for sessions:', error)
      throw error
    }
  }

  /**
   * Create a new session for a user
   */
  async createSession(sessionId: string, sessionData: SessionData): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const key = this.getSessionKey(sessionId)
    const now = Date.now()

    const data: SessionData = {
      ...sessionData,
      createdAt: now,
      lastActivity: now,
    }

    await this.redisClient.setEx(key, this.SESSION_TTL, JSON.stringify(data))
  }

  /**
   * Get session data by session ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const key = this.getSessionKey(sessionId)
    const data = await this.redisClient.get(key)

    if (!data) {
      return null
    }

    const sessionData: SessionData = JSON.parse(data)

    // Update last activity and refresh TTL
    sessionData.lastActivity = Date.now()
    await this.redisClient.setEx(key, this.SESSION_TTL, JSON.stringify(sessionData))

    return sessionData
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const key = this.getSessionKey(sessionId)
    await this.redisClient.del(key)
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    // Find all session keys for this user
    const pattern = `${this.SESSION_PREFIX}*`
    const keys = await this.redisClient.keys(pattern)

    for (const key of keys) {
      const data = await this.redisClient.get(key)
      if (data) {
        const sessionData: SessionData = JSON.parse(data)
        if (sessionData.userId === userId) {
          await this.redisClient.del(key)
        }
      }
    }
  }

  /**
   * Check if a session exists and is valid
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const key = this.getSessionKey(sessionId)
    const exists = await this.redisClient.exists(key)
    return exists === 1
  }

  /**
   * Get session TTL (time to live) in seconds
   */
  async getSessionTTL(sessionId: string): Promise<number> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const key = this.getSessionKey(sessionId)
    return await this.redisClient.ttl(key)
  }

  /**
   * Refresh session TTL (extend expiration)
   */
  async refreshSession(sessionId: string): Promise<void> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const key = this.getSessionKey(sessionId)
    const data = await this.redisClient.get(key)

    if (data) {
      const sessionData: SessionData = JSON.parse(data)
      sessionData.lastActivity = Date.now()
      await this.redisClient.setEx(key, this.SESSION_TTL, JSON.stringify(sessionData))
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    if (!this.redisClient) {
      throw new Error('Redis client not initialized')
    }

    const pattern = `${this.SESSION_PREFIX}*`
    const keys = await this.redisClient.keys(pattern)
    const sessions: SessionData[] = []

    for (const key of keys) {
      const data = await this.redisClient.get(key)
      if (data) {
        const sessionData: SessionData = JSON.parse(data)
        if (sessionData.userId === userId) {
          sessions.push(sessionData)
        }
      }
    }

    return sessions
  }

  private getSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`
  }
}
