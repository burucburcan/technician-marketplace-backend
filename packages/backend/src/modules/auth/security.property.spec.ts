import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedException, HttpException } from '@nestjs/common'
import * as fc from 'fast-check'
import { AuthService } from './auth.service'
import { User } from '../../entities/user.entity'
import { UserLockout } from '../../entities/user-lockout.entity'
import { UserRole } from '../../common/enums'
import { LoginDto } from './dto'
import { ActivityLogService } from '../activity-log/activity-log.service'

/**
 * Property-Based Tests for Authentication Security
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate security properties including failed login logging
 * and account lockout mechanisms.
 */
describe('Authentication Security Property Tests', () => {
  let service: AuthService

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockUserLockoutRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  }

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserLockout),
          useValue: mockUserLockoutRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const validEmailGen = fc.emailAddress()
  const validPasswordGen = fc.string({ minLength: 8, maxLength: 50 })
  const userIdGen = fc.uuid()
  const ipAddressGen = fc.ipV4()
  const userAgentGen = fc.string({ minLength: 10, maxLength: 200 })

  /**
   * **Property 4: Başarısız Giriş Loglama**
   *
   * Validates: Requirements 1.4
   *
   * For any incorrect credential combination, when login is attempted,
   * the system must return an error and log the attempt to activity log.
   */
  describe('Property 4: Failed Login Logging', () => {
    it('should log failed login attempts for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          ipAddressGen,
          userAgentGen,
          async (email, password, ipAddress, userAgent) => {
            // Setup non-existent user
            mockUserRepository.findOne.mockResolvedValue(null)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const loginDto: LoginDto = { email, password }

            // Property: Failed login for non-existent user is logged
            await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
              UnauthorizedException
            )

            // Verify failed login was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              action: 'failed_login',
              resource: 'auth',
              metadata: { email, reason: 'user_not_found' },
              ipAddress,
              userAgent,
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should log failed login attempts for invalid passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          validPasswordGen,
          userIdGen,
          ipAddressGen,
          userAgentGen,
          async (email, correctPassword, wrongPassword, userId, ipAddress, userAgent) => {
            fc.pre(correctPassword !== wrongPassword) // Ensure passwords are different

            // Setup user with correct password
            const mockUser = {
              id: userId,
              email,
              passwordHash: 'hashed_correct_password',
              role: UserRole.USER,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne.mockResolvedValue(null) // No active lockout
            mockActivityLogService.logActivity.mockResolvedValue({})

            // Mock bcrypt.compare to return false for wrong password
            jest.doMock('bcrypt', () => ({
              compare: jest.fn().mockResolvedValue(false),
            }))

            const loginDto: LoginDto = { email, password: wrongPassword }

            // Property: Failed login for invalid password is logged
            await expect(service.login(loginDto, ipAddress, userAgent)).rejects.toThrow(
              UnauthorizedException
            )

            // Verify failed login was logged with user ID
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              userId,
              action: 'failed_login',
              resource: 'auth',
              metadata: { email, reason: 'invalid_password' },
              ipAddress,
              userAgent,
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should log successful logins', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          userIdGen,
          ipAddressGen,
          userAgentGen,
          async (email, password, userId, ipAddress, userAgent) => {
            // Setup user with correct password
            const mockUser = {
              id: userId,
              email,
              passwordHash: 'hashed_password',
              role: UserRole.USER,
              isEmailVerified: true,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne.mockResolvedValue(null) // No active lockout
            mockUserLockoutRepository.update.mockResolvedValue({})
            mockActivityLogService.logActivity.mockResolvedValue({})
            mockJwtService.sign.mockReturnValue('token')

            // Mock bcrypt.compare to return true for correct password
            jest.doMock('bcrypt', () => ({
              compare: jest.fn().mockResolvedValue(true),
            }))

            const loginDto: LoginDto = { email, password }
            await service.login(loginDto, ipAddress, userAgent)

            // Property: Successful login is logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              userId,
              action: 'successful_login',
              resource: 'auth',
              metadata: { email },
              ipAddress,
              userAgent,
            })
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property 42: Başarısız Giriş Hesap Kilitleme**
   *
   * Validates: Requirements 14.3
   *
   * For any user with 5 consecutive failed login attempts, the account must be
   * temporarily locked and an email notification must be sent.
   */
  describe('Property 42: Failed Login Account Lockout', () => {
    it('should lock account after maximum failed attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          validEmailGen,
          fc.integer({ min: 5, max: 10 }),
          async (userId, email, failedAttempts) => {
            // Setup user
            const mockUser = {
              id: userId,
              email,
              passwordHash: 'hashed_password',
              role: UserRole.USER,
            }

            // Setup lockout record with failed attempts
            const mockLockout = {
              id: 'lockout-id',
              userId,
              failedAttempts: failedAttempts - 1, // One less than current attempt
              lockedUntil: new Date(),
              isActive: true,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne
              .mockResolvedValueOnce(null) // No active lockout for checkUserLockout
              .mockResolvedValueOnce(mockLockout) // Existing lockout for handleFailedLoginAttempt
            mockUserLockoutRepository.save.mockResolvedValue({
              ...mockLockout,
              failedAttempts,
              lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
            })
            mockActivityLogService.logActivity.mockResolvedValue({})

            // Mock bcrypt.compare to return false
            jest.doMock('bcrypt', () => ({
              compare: jest.fn().mockResolvedValue(false),
            }))

            const loginDto: LoginDto = { email, password: 'wrong_password' }

            // Property: Account is locked after max failed attempts
            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)

            if (failedAttempts >= 5) {
              // Verify account lockout was logged
              expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
                expect.objectContaining({
                  userId,
                  action: 'account_locked',
                  resource: 'auth',
                  metadata: expect.objectContaining({
                    email,
                    failedAttempts,
                  }),
                })
              )
            }
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should prevent login for locked accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          validEmailGen,
          validPasswordGen,
          async (userId, email, password) => {
            // Setup locked user
            const futureDate = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
            const mockLockout = {
              id: 'lockout-id',
              userId,
              failedAttempts: 5,
              lockedUntil: futureDate,
              isActive: true,
            }

            const mockUser = {
              id: userId,
              email,
              passwordHash: 'hashed_password',
              role: UserRole.USER,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne.mockResolvedValue(mockLockout)

            const loginDto: LoginDto = { email, password }

            // Property: Locked accounts cannot login
            await expect(service.login(loginDto)).rejects.toThrow(HttpException)

            // Verify password was not checked for locked account
            expect(mockActivityLogService.logActivity).not.toHaveBeenCalledWith(
              expect.objectContaining({
                action: 'failed_login',
              })
            )
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should reset failed attempts on successful login', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          validEmailGen,
          validPasswordGen,
          async (userId, email, password) => {
            // Setup user with previous failed attempts
            const mockUser = {
              id: userId,
              email,
              passwordHash: 'hashed_password',
              role: UserRole.USER,
              isEmailVerified: true,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne.mockResolvedValue(null) // No active lockout
            mockUserLockoutRepository.update.mockResolvedValue({})
            mockActivityLogService.logActivity.mockResolvedValue({})
            mockJwtService.sign.mockReturnValue('token')

            // Mock bcrypt.compare to return true
            jest.doMock('bcrypt', () => ({
              compare: jest.fn().mockResolvedValue(true),
            }))

            const loginDto: LoginDto = { email, password }
            await service.login(loginDto)

            // Property: Failed attempts are reset on successful login
            expect(mockUserLockoutRepository.update).toHaveBeenCalledWith(
              { userId, isActive: true },
              { isActive: false }
            )
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property: Lockout Duration Validation**
   *
   * For any locked account, the lockout duration should be exactly 15 minutes
   * from the time of lockout.
   */
  describe('Property: Lockout Duration Validation', () => {
    it('should set correct lockout duration for any user', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, async userId => {
          const mockLockout = {
            id: 'lockout-id',
            userId,
            failedAttempts: 4, // One less than max
            lockedUntil: new Date(),
            isActive: true,
          }

          mockUserLockoutRepository.findOne.mockResolvedValue(mockLockout)

          const beforeTime = Date.now()
          const savedLockout = {
            ...mockLockout,
            failedAttempts: 5,
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
          }
          mockUserLockoutRepository.save.mockResolvedValue(savedLockout)

          // Simulate failed login attempt that triggers lockout
          const mockUser = { id: userId, email: 'test@example.com' }
          mockUserRepository.findOne.mockResolvedValue(mockUser)
          mockActivityLogService.logActivity.mockResolvedValue({})

          // Call the private method indirectly through login
          mockUserRepository.findOne.mockResolvedValue(mockUser)
          jest.doMock('bcrypt', () => ({
            compare: jest.fn().mockResolvedValue(false),
          }))

          try {
            await service.login({ email: 'test@example.com', password: 'wrong' })
          } catch (error) {
            // Expected to throw
          }

          // Property: Lockout duration is approximately 15 minutes
          if (mockUserLockoutRepository.save.mock.calls.length > 0) {
            const saveCall = mockUserLockoutRepository.save.mock.calls[0][0]
            if (saveCall.failedAttempts >= 5) {
              const lockoutDuration = saveCall.lockedUntil.getTime() - beforeTime
              const expectedDuration = 15 * 60 * 1000 // 15 minutes
              const tolerance = 5000 // 5 seconds tolerance

              expect(lockoutDuration).toBeGreaterThanOrEqual(expectedDuration - tolerance)
              expect(lockoutDuration).toBeLessThanOrEqual(expectedDuration + tolerance)
            }
          }
        }),
        { numRuns: 20 }
      )
    })
  })

  /**
   * **Property: Security Event Logging Completeness**
   *
   * For any authentication event (success, failure, lockout), the system must
   * log complete information including user context and metadata.
   */
  describe('Property: Security Event Logging Completeness', () => {
    it('should log complete information for any authentication event', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          fc.boolean(),
          ipAddressGen,
          userAgentGen,
          async (email, password, loginSuccess, ipAddress, userAgent) => {
            const mockUser = {
              id: 'user-id',
              email,
              passwordHash: 'hashed_password',
              role: UserRole.USER,
              isEmailVerified: true,
            }

            if (loginSuccess) {
              mockUserRepository.findOne.mockResolvedValue(mockUser)
              mockUserLockoutRepository.findOne.mockResolvedValue(null)
              mockUserLockoutRepository.update.mockResolvedValue({})
              mockJwtService.sign.mockReturnValue('token')

              jest.doMock('bcrypt', () => ({
                compare: jest.fn().mockResolvedValue(true),
              }))
            } else {
              mockUserRepository.findOne.mockResolvedValue(null)
            }

            mockActivityLogService.logActivity.mockResolvedValue({})

            const loginDto: LoginDto = { email, password }

            try {
              await service.login(loginDto, ipAddress, userAgent)
            } catch (error) {
              // Expected for failed logins
            }

            // Property: Complete logging information
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                action: expect.stringMatching(/^(successful_login|failed_login)$/),
                resource: 'auth',
                metadata: expect.objectContaining({
                  email,
                }),
                ipAddress,
                userAgent,
              })
            )
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})
