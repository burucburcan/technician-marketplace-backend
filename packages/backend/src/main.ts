import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { getSecurityConfig } from './config/security.config'
import * as dns from 'dns'

// Force IPv4 DNS resolution globally
dns.setDefaultResultOrder('ipv4first')

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    })
    const securityConfig = getSecurityConfig()

    // Apply Helmet security headers
    app.use(
      helmet({
        contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy,
        hsts: securityConfig.helmet.hsts,
        frameguard: { action: 'deny' },
        noSniff: true,
        xssFilter: true,
        hidePoweredBy: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        dnsPrefetchControl: { allow: false },
        ieNoOpen: true,
      })
    )

    // Enable CORS with security configuration
    app.enableCors({
      origin: securityConfig.cors.origin,
      credentials: securityConfig.cors.credentials,
      methods: securityConfig.cors.methods,
      allowedHeaders: securityConfig.cors.allowedHeaders,
    })

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    )

    const port = process.env.PORT || 3000
    await app.listen(port)
    console.log(`Application is running on: http://localhost:${port}`)
  } catch (error) {
    console.error('Failed to start application:', error)
    console.error('Error stack:', error.stack)
    process.exit(1)
  }
}

bootstrap().catch((error) => {
  console.error('Bootstrap failed:', error)
  console.error('Error stack:', error.stack)
  process.exit(1)
})
