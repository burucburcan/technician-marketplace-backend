import { ThrottlerModuleOptions } from '@nestjs/throttler'

export interface SecurityConfig {
  cors: {
    origin: string | string[]
    credentials: boolean
    methods: string[]
    allowedHeaders: string[]
  }
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: string[]
        styleSrc: string[]
        scriptSrc: string[]
        imgSrc: string[]
        connectSrc: string[]
        fontSrc: string[]
        objectSrc: string[]
        mediaSrc: string[]
        frameSrc: string[]
      }
    }
    hsts: {
      maxAge: number
      includeSubDomains: boolean
      preload: boolean
    }
  }
  rateLimit: {
    auth: { ttl: number; limit: number }
    api: { ttl: number; limit: number }
    public: { ttl: number; limit: number }
  }
}

export const getSecurityConfig = (): SecurityConfig => {
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:3001']

  return {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
    },
    rateLimit: {
      // Authentication endpoints: 5 requests per 15 minutes per IP
      auth: {
        ttl: 900000, // 15 minutes in milliseconds
        limit: 5,
      },
      // API endpoints: 100 requests per minute per user
      api: {
        ttl: 60000, // 1 minute in milliseconds
        limit: 100,
      },
      // Public endpoints: 20 requests per minute per IP
      public: {
        ttl: 60000, // 1 minute in milliseconds
        limit: 20,
      },
    },
  }
}
