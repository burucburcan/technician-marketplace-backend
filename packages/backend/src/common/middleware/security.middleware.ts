import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import { getSecurityConfig } from '../../config/security.config'

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private helmetMiddleware: ReturnType<typeof helmet>

  constructor() {
    const config = getSecurityConfig()

    this.helmetMiddleware = helmet({
      // Content Security Policy
      contentSecurityPolicy: config.helmet.contentSecurityPolicy,

      // HTTP Strict Transport Security
      hsts: config.helmet.hsts,

      // X-Frame-Options (clickjacking protection)
      frameguard: {
        action: 'deny',
      },

      // X-Content-Type-Options (MIME sniffing protection)
      noSniff: true,

      // X-XSS-Protection
      xssFilter: true,

      // Hide X-Powered-By header
      hidePoweredBy: true,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false,
      },

      // IE No Open
      ieNoOpen: true,
    })
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.helmetMiddleware(req, res, next)
  }
}
