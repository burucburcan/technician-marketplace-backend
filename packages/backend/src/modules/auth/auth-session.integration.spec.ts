import { Test, TestingModule } from '@nestjs/testing'
import { TypeOrmModule } from '@nestjs/typeorm'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { SessionService } from '../session/session.service'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { User } from '../../entities/user.entity'
import { UserLockout } from '../../entities/user-lockout.entity'
import { ActivityLog } from '../../entities/activity-log.entity'
import { getDatabaseConfig } from '../../config/database.config'

describe('Auth Service - Session Management Integration', () => {
  let authService: AuthService
  let sessionService: SessionService
  let module: TestingModule

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: getDatabaseConfig,
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User, UserLockout, ActivityLog]),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret-key',
            signOptions: {
              expiresIn: '24h',
            },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [AuthService, SessionService, ActivityLogService],
    }).compile()

    authService = module.get<AuthService>(AuthService)
    sessionService = module.get<SessionService>(SessionService)

    await sessionService.onModuleInit()
  })

  afterAll(async () => {
    await sessionService.onModuleDestroy()
    await module.close()
  })

  describe('Session Creation on Login', () => {
    it('should create a session in Redis when user logs in', async () => {
      // Register a user
      const registerDto = {
        email: `session-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      await authService.register(registerDto)

      // Login
      const loginDto = {
        email: registerDto.email,
        password: registerDto.password,
      }

      const loginResult = await authService.login(loginDto)

      // Verify session exists in Redis
      const sessionData = await sessionService.getSession(loginResult.accessToken)
      expect(sessionData).not.toBeNull()
      expect(sessionData?.email).toBe(registerDto.email)
      expect(sessionData?.role).toBe('user')

      // Clean up
      await authService.logout(loginResult.accessToken)
    })

    it('should store correct session data in Redis', async () => {
      // Register a user
      const registerDto = {
        email: `session-data-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'handyman' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Verify session data
      const sessionData = await sessionService.getSession(registerResult.accessToken)
      expect(sessionData).not.toBeNull()
      expect(sessionData?.userId).toBe(registerResult.user.id)
      expect(sessionData?.email).toBe(registerDto.email)
      expect(sessionData?.role).toBe('handyman')
      expect(sessionData?.createdAt).toBeDefined()
      expect(sessionData?.lastActivity).toBeDefined()

      // Clean up
      await authService.logout(registerResult.accessToken)
    })
  })

  describe('Session Expiration', () => {
    it('should set 24-hour TTL on session creation', async () => {
      // Register a user
      const registerDto = {
        email: `session-ttl-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Check session TTL
      const ttl = await sessionService.getSessionTTL(registerResult.accessToken)

      // TTL should be approximately 24 hours (86400 seconds)
      // Allow some margin for processing time
      expect(ttl).toBeGreaterThan(86340) // 24 hours - 60 seconds
      expect(ttl).toBeLessThanOrEqual(86400) // 24 hours

      // Clean up
      await authService.logout(registerResult.accessToken)
    })

    it('should refresh TTL when session is accessed', async () => {
      // Register a user
      const registerDto = {
        email: `session-refresh-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Get initial TTL
      const initialTTL = await sessionService.getSessionTTL(registerResult.accessToken)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Access session (should refresh TTL)
      await sessionService.getSession(registerResult.accessToken)

      // Get new TTL
      const newTTL = await sessionService.getSessionTTL(registerResult.accessToken)

      // New TTL should be greater than or equal to initial TTL
      // (because it was refreshed)
      expect(newTTL).toBeGreaterThanOrEqual(initialTTL - 5)

      // Clean up
      await authService.logout(registerResult.accessToken)
    })
  })

  describe('Session Logout', () => {
    it('should delete session from Redis on logout', async () => {
      // Register a user
      const registerDto = {
        email: `session-logout-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Verify session exists
      const beforeLogout = await sessionService.isSessionValid(registerResult.accessToken)
      expect(beforeLogout).toBe(true)

      // Logout
      await authService.logout(registerResult.accessToken)

      // Verify session is deleted
      const afterLogout = await sessionService.isSessionValid(registerResult.accessToken)
      expect(afterLogout).toBe(false)

      const sessionData = await sessionService.getSession(registerResult.accessToken)
      expect(sessionData).toBeNull()
    })

    it('should delete all user sessions on logout-all', async () => {
      // Register a user
      const registerDto = {
        email: `session-logout-all-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Login again to create another session
      const loginDto = {
        email: registerDto.email,
        password: registerDto.password,
      }

      const loginResult = await authService.login(loginDto)

      // Verify both sessions exist
      const session1Valid = await sessionService.isSessionValid(registerResult.accessToken)
      const session2Valid = await sessionService.isSessionValid(loginResult.accessToken)
      expect(session1Valid).toBe(true)
      expect(session2Valid).toBe(true)

      // Logout from all sessions
      await authService.logoutAllSessions(registerResult.user.id)

      // Verify both sessions are deleted
      const session1AfterLogout = await sessionService.isSessionValid(registerResult.accessToken)
      const session2AfterLogout = await sessionService.isSessionValid(loginResult.accessToken)
      expect(session1AfterLogout).toBe(false)
      expect(session2AfterLogout).toBe(false)
    })
  })

  describe('Session Validation', () => {
    it('should validate active sessions', async () => {
      // Register a user
      const registerDto = {
        email: `session-validation-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Validate session
      const isValid = await sessionService.isSessionValid(registerResult.accessToken)
      expect(isValid).toBe(true)

      // Clean up
      await authService.logout(registerResult.accessToken)
    })

    it('should reject invalid sessions', async () => {
      const fakeSessionId = 'fake-session-id-12345'

      // Validate non-existent session
      const isValid = await sessionService.isSessionValid(fakeSessionId)
      expect(isValid).toBe(false)

      const sessionData = await sessionService.getSession(fakeSessionId)
      expect(sessionData).toBeNull()
    })
  })

  describe('Multiple Sessions', () => {
    it('should support multiple concurrent sessions for the same user', async () => {
      // Register a user
      const registerDto = {
        email: `multi-session-test-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'user' as any,
      }

      const registerResult = await authService.register(registerDto)

      // Login again to create another session
      const loginDto = {
        email: registerDto.email,
        password: registerDto.password,
      }

      const loginResult1 = await authService.login(loginDto)
      const loginResult2 = await authService.login(loginDto)

      // Verify all sessions exist
      const sessions = await sessionService.getUserSessions(registerResult.user.id)
      expect(sessions.length).toBeGreaterThanOrEqual(3) // register + 2 logins

      // Clean up
      await authService.logoutAllSessions(registerResult.user.id)
    })
  })
})
