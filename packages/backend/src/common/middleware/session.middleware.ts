import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { SessionService } from '../../modules/session/session.service'

// Extend Express Request to include session data
declare global {
  namespace Express {
    interface Request {
      sessionId?: string
      sessionData?: {
        userId: string
        email: string
        role: string
        createdAt: number
        lastActivity: number
      }
    }
  }
}

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessionService: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract session ID from Authorization header or cookie
    const sessionId = this.extractSessionId(req)

    if (!sessionId) {
      // No session ID provided, continue without session
      return next()
    }

    try {
      // Validate session
      const sessionData = await this.sessionService.getSession(sessionId)

      if (!sessionData) {
        // Session expired or invalid
        throw new UnauthorizedException('Session expired or invalid')
      }

      // Attach session data to request
      req.sessionId = sessionId
      req.sessionData = sessionData

      next()
    } catch (error) {
      // Session validation failed
      next(error)
    }
  }

  private extractSessionId(req: Request): string | null {
    // Try to extract from Authorization header (Bearer token format)
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Try to extract from cookie
    const sessionCookie = req.cookies?.sessionId
    if (sessionCookie) {
      return sessionCookie
    }

    return null
  }
}
