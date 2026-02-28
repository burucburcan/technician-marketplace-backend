import { SetMetadata } from '@nestjs/common'
import { Throttle as NestThrottle } from '@nestjs/throttler'

// Custom throttle presets for different endpoint types
export const THROTTLE_AUTH = () => NestThrottle({ default: { ttl: 900000, limit: 5 } }) // 5 requests per 15 minutes
export const THROTTLE_API = () => NestThrottle({ default: { ttl: 60000, limit: 100 } }) // 100 requests per minute
export const THROTTLE_PUBLIC = () => NestThrottle({ default: { ttl: 60000, limit: 20 } }) // 20 requests per minute

// Skip throttling for specific routes
export const SKIP_THROTTLE = 'skipThrottle'
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE, true)
