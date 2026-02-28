import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { BadRequestException } from '@nestjs/common'
import * as fc from 'fast-check'
import { AuthService } from './auth.service'
import { User } from '../../entities/user.entity'
import { UserLockout } from '../../entities/user-lockout.entity'
import { UserRole } from '../../common/enums'
import { ActivityLogService } from '../activity-log/activity-log.service'

/**
 * Property-Based Tests for Email Verification
 *
 * **Feature: technician-marketplace-platform, Property 2: Email Doğrulama Aktivasyonu**
 *
 * Validates: Requirements 1.2
 *
 * For any registered user with a valid verification token, when email verification
 * is performed, the user's isEmailVerified field must be set to true.
 */
describe('Email Verification Property Tests', () => {
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
  const userIdGen = fc.uuid()
  const validEmailGen = fc.emailAddress()
  const userRoleGen = fc.constantFrom(...Object.values(UserRole))
  const tokenGen = fc.string({ minLength: 10, maxLength: 200 })

  /**
   * **Property 2: Email Doğrulama Aktivasyonu**
   *
   * Validates: Requirements 1.2
   *
   * For any registered user with a valid verification token, when email verification
   * is performed, the user's isEmailVerified field must be set to true.
   */
  describe('Property 2: Email Verification Activation', () => {
    it('should activate email verification for any user with valid token', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          validEmailGen,
          userRoleGen,
          tokenGen,
          async (userId, email, role, token) => {
            // Setup unverified user
            const mockUser = {
              id: userId,
              email,
              role,
              isEmailVerified: false,
              passwordHash: 'hashed_password',
              twoFactorEnabled: false,
              twoFactorSecret: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            // Setup valid token verification
            mockJwtService.verify.mockReturnValue({
              sub: userId,
              type: 'email_verification',
            })
            mockUserRepository.findOne.mockResolvedValue(mockUser)

            // Mock save to return updated user
            const updatedUser = { ...mockUser, isEmailVerified: true }
            mockUserRepository.save.mockResolvedValue(updatedUser)

            const result = await service.verifyEmail(token)

            // Property: Email verification activation
            expect(result.message).toBe('Email verified successfully')
            expect(result.user.isEmailVerified).toBe(true)
            expect(result.user.email).toBe(email)
            expect(result.user).not.toHaveProperty('passwordHash')

            // Verify token was validated correctly
            expect(mockJwtService.verify).toHaveBeenCalledWith(token)

            // Verify user was found and updated
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
              where: { id: userId },
            })
            expect(mockUserRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                id: userId,
                isEmailVerified: true,
              })
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle already verified users gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, validEmailGen, tokenGen, async (userId, email, token) => {
          // Setup already verified user
          const mockUser = {
            id: userId,
            email,
            isEmailVerified: true,
            role: UserRole.USER,
          }

          mockJwtService.verify.mockReturnValue({
            sub: userId,
            type: 'email_verification',
          })
          mockUserRepository.findOne.mockResolvedValue(mockUser)

          const result = await service.verifyEmail(token)

          // Property: Already verified users handled gracefully
          expect(result.message).toBe('Email already verified')
          expect(result.user.isEmailVerified).toBe(true)
          expect(result.user.email).toBe(email)

          // Verify save was not called for already verified user
          expect(mockUserRepository.save).not.toHaveBeenCalled()
        }),
        { numRuns: 30 }
      )
    })

    it('should reject invalid verification tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          tokenGen,
          fc.constantFrom('invalid_type', 'password_reset', 'other'),
          async (token, invalidType) => {
            // Setup invalid token type
            mockJwtService.verify.mockReturnValue({
              sub: 'user-id',
              type: invalidType,
            })

            // Property: Invalid token types are rejected
            await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException)
            expect(mockUserRepository.findOne).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should reject expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(tokenGen, async token => {
          // Setup expired token
          const expiredError = new Error('Token expired')
          expiredError.name = 'TokenExpiredError'
          mockJwtService.verify.mockImplementation(() => {
            throw expiredError
          })

          // Property: Expired tokens are rejected
          await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException)
          expect(mockUserRepository.findOne).not.toHaveBeenCalled()
        }),
        { numRuns: 20 }
      )
    })

    it('should reject malformed tokens', async () => {
      await fc.assert(
        fc.asyncProperty(tokenGen, async token => {
          // Setup malformed token
          const malformedError = new Error('Invalid token')
          malformedError.name = 'JsonWebTokenError'
          mockJwtService.verify.mockImplementation(() => {
            throw malformedError
          })

          // Property: Malformed tokens are rejected
          await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException)
          expect(mockUserRepository.findOne).not.toHaveBeenCalled()
        }),
        { numRuns: 20 }
      )
    })

    it('should reject tokens for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, tokenGen, async (userId, token) => {
          // Setup valid token but non-existent user
          mockJwtService.verify.mockReturnValue({
            sub: userId,
            type: 'email_verification',
          })
          mockUserRepository.findOne.mockResolvedValue(null)

          // Property: Tokens for non-existent users are rejected
          await expect(service.verifyEmail(token)).rejects.toThrow(BadRequestException)
          expect(mockUserRepository.save).not.toHaveBeenCalled()
        }),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property: Email Verification Token Generation**
   *
   * For any user ID, the system should generate a valid email verification token
   * that contains the correct payload structure.
   */
  describe('Property: Email Verification Token Generation', () => {
    it('should generate valid verification tokens for any user ID', () => {
      fc.assert(
        fc.property(userIdGen, userId => {
          mockJwtService.sign.mockReturnValue('verification_token')

          const token = service.generateEmailVerificationToken(userId)

          // Property: Token generation consistency
          expect(token).toBe('verification_token')
          expect(mockJwtService.sign).toHaveBeenCalledWith(
            {
              sub: userId,
              type: 'email_verification',
            },
            { expiresIn: '24h' }
          )
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Property: Resend Verification Email**
   *
   * For any unverified user, the system should allow resending verification emails
   * and generate new tokens.
   */
  describe('Property: Resend Verification Email', () => {
    it('should resend verification for any unverified user', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailGen, userIdGen, async (email, userId) => {
          // Setup unverified user
          const mockUser = {
            id: userId,
            email,
            isEmailVerified: false,
            role: UserRole.USER,
          }

          mockUserRepository.findOne.mockResolvedValue(mockUser)
          mockJwtService.sign.mockReturnValue('new_verification_token')

          const result = await service.resendVerificationEmail(email)

          // Property: Resend verification for unverified users
          expect(result.message).toBe('Verification email sent')
          expect(result.verificationToken).toBe('new_verification_token')

          expect(mockUserRepository.findOne).toHaveBeenCalledWith({
            where: { email },
          })
        }),
        { numRuns: 30 }
      )
    })

    it('should reject resend for already verified users', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailGen, async email => {
          // Setup already verified user
          const mockUser = {
            id: 'user-id',
            email,
            isEmailVerified: true,
            role: UserRole.USER,
          }

          mockUserRepository.findOne.mockResolvedValue(mockUser)

          // Property: Already verified users cannot resend verification
          await expect(service.resendVerificationEmail(email)).rejects.toThrow(BadRequestException)
        }),
        { numRuns: 20 }
      )
    })

    it('should reject resend for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailGen, async email => {
          mockUserRepository.findOne.mockResolvedValue(null)

          // Property: Non-existent users cannot resend verification
          await expect(service.resendVerificationEmail(email)).rejects.toThrow(BadRequestException)
        }),
        { numRuns: 20 }
      )
    })
  })
})
