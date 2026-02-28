import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import * as fc from 'fast-check'
import { AuthService } from './auth.service'
import { User } from '../../entities/user.entity'
import { UserLockout } from '../../entities/user-lockout.entity'
import { UserRole } from '../../common/enums'
import { RegisterDto, LoginDto } from './dto'
import { ActivityLogService } from '../activity-log/activity-log.service'

/**
 * Property-Based Tests for Authentication Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the authentication system, ensuring correctness at scale.
 */
describe('AuthService Property Tests', () => {
  let service: AuthService

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
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
  const userRoleGen = fc.constantFrom(...Object.values(UserRole))
  const userIdGen = fc.uuid()

  /**
   * **Property 1: Kullanıcı Kaydı Round-Trip**
   *
   * Validates: Requirements 1.1
   *
   * For any valid email and password combination, when registration is performed,
   * the system must create a user account that can be retrieved from the database
   * with the same values.
   */
  describe('Property 1: User Registration Round-Trip', () => {
    it('should create and retrieve user with same values for any valid registration data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          userRoleGen,
          async (email, password, role) => {
            // Setup mocks
            const mockUser = {
              id: 'test-id',
              email,
              passwordHash: 'hashed_password',
              role,
              isEmailVerified: false,
              twoFactorEnabled: false,
              twoFactorSecret: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(null) // No existing user
            mockUserRepository.create.mockReturnValue(mockUser)
            mockUserRepository.save.mockResolvedValue(mockUser)
            mockJwtService.sign.mockReturnValue('mock_token')

            const registerDto: RegisterDto = { email, password, role }
            const result = await service.register(registerDto)

            // Property: User data round-trip integrity
            expect(result.user.email).toBe(email)
            expect(result.user.role).toBe(role)
            expect(result.user.isEmailVerified).toBe(false)
            expect(result.user).not.toHaveProperty('passwordHash')
            expect(result).toHaveProperty('accessToken')
            expect(result).toHaveProperty('refreshToken')
            expect(result).toHaveProperty('expiresIn')

            // Verify password was hashed
            expect(mockUserRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                email,
                role,
                isEmailVerified: false,
                passwordHash: expect.any(String),
              })
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject duplicate email registrations for any email', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailGen, validPasswordGen, async (email, password) => {
          // Setup existing user
          const existingUser = { id: 'existing-id', email }
          mockUserRepository.findOne.mockResolvedValue(existingUser)

          const registerDto: RegisterDto = { email, password }

          // Property: Duplicate email rejection
          await expect(service.register(registerDto)).rejects.toThrow(ConflictException)
          expect(mockUserRepository.create).not.toHaveBeenCalled()
        }),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property 3: Başarılı Giriş Token Üretimi**
   *
   * Validates: Requirements 1.3
   *
   * For any verified user with valid credentials, when login is performed,
   * the system must generate a valid JWT token containing user information.
   */
  describe('Property 3: Successful Login Token Generation', () => {
    it('should generate valid tokens for any valid user credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          userIdGen,
          userRoleGen,
          async (email, password, userId, role) => {
            // Setup user with hashed password
            const hashedPassword = await bcrypt.hash(password, 10)
            const mockUser = {
              id: userId,
              email,
              passwordHash: hashedPassword,
              role,
              isEmailVerified: true,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne.mockResolvedValue(null) // No lockout
            mockJwtService.sign
              .mockReturnValueOnce('access_token')
              .mockReturnValueOnce('refresh_token')
            mockActivityLogService.logActivity.mockResolvedValue({})

            const loginDto: LoginDto = { email, password }
            const result = await service.login(loginDto)

            // Property: Token generation for valid credentials
            expect(result).toHaveProperty('accessToken', 'access_token')
            expect(result).toHaveProperty('refreshToken', 'refresh_token')
            expect(result).toHaveProperty('expiresIn', 86400)
            expect(result.user.email).toBe(email)
            expect(result.user.role).toBe(role)
            expect(result.user).not.toHaveProperty('passwordHash')

            // Verify JWT payload structure
            expect(mockJwtService.sign).toHaveBeenCalledWith(
              {
                sub: userId,
                email,
                role,
              },
              { expiresIn: '24h' }
            )

            // Verify successful login was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                action: 'successful_login',
                resource: 'auth',
                metadata: { email },
              })
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject login for any invalid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(
          validEmailGen,
          validPasswordGen,
          validPasswordGen,
          async (email, correctPassword, wrongPassword) => {
            fc.pre(correctPassword !== wrongPassword) // Ensure passwords are different

            const hashedPassword = await bcrypt.hash(correctPassword, 10)
            const mockUser = {
              id: 'user-id',
              email,
              passwordHash: hashedPassword,
              role: UserRole.USER,
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserLockoutRepository.findOne.mockResolvedValue(null)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const loginDto: LoginDto = { email, password: wrongPassword }

            // Property: Invalid credentials rejection
            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)

            // Verify failed login was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'user-id',
                action: 'failed_login',
                resource: 'auth',
                metadata: { email, reason: 'invalid_password' },
              })
            )
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property 5: Şifre Hash Güvenliği**
   *
   * Validates: Requirements 1.6
   *
   * For any user, the password field stored in the database must never be
   * plain text and must be encrypted using a hash algorithm.
   */
  describe('Property 5: Password Hash Security', () => {
    it('should never store plain text passwords for any user', async () => {
      await fc.assert(
        fc.asyncProperty(validEmailGen, validPasswordGen, async (email, password) => {
          const mockUser = {
            id: 'test-id',
            email,
            passwordHash: 'will-be-hashed',
            role: UserRole.USER,
            isEmailVerified: false,
          }

          mockUserRepository.findOne.mockResolvedValue(null)
          mockUserRepository.create.mockReturnValue(mockUser)
          mockUserRepository.save.mockResolvedValue(mockUser)
          mockJwtService.sign.mockReturnValue('token')

          const registerDto: RegisterDto = { email, password }
          await service.register(registerDto)

          // Property: Password must be hashed, never plain text
          const createCall = mockUserRepository.create.mock.calls[0][0]
          expect(createCall.passwordHash).toBeDefined()
          expect(createCall.passwordHash).not.toBe(password)
          expect(createCall.passwordHash.length).toBeGreaterThan(password.length)

          // Verify it's a bcrypt hash (starts with $2b$ and has proper length)
          expect(createCall.passwordHash).toMatch(/^\$2b\$\d+\$.{53}$/)
        }),
        { numRuns: 30 }
      )
    })

    it('should generate different hashes for the same password', async () => {
      await fc.assert(
        fc.asyncProperty(validPasswordGen, async password => {
          const hash1 = await bcrypt.hash(password, 10)
          const hash2 = await bcrypt.hash(password, 10)

          // Property: Same password should generate different hashes (salt)
          expect(hash1).not.toBe(hash2)

          // But both should verify correctly
          expect(await bcrypt.compare(password, hash1)).toBe(true)
          expect(await bcrypt.compare(password, hash2)).toBe(true)
        }),
        { numRuns: 20 }
      )
    })
  })

  /**
   * **Property: Token Payload Consistency**
   *
   * For any user, generated tokens must contain consistent user information
   * that matches the user's actual data.
   */
  describe('Property: Token Payload Consistency', () => {
    it('should generate tokens with consistent user data for any user', async () => {
      await fc.assert(
        fc.property(userIdGen, validEmailGen, userRoleGen, (userId, email, role) => {
          const mockUser = { id: userId, email, role } as User
          mockJwtService.sign.mockReturnValue('token')

          const result = service.generateTokens(mockUser)

          // Property: Token payload consistency
          expect(result).toHaveProperty('accessToken', 'token')
          expect(result).toHaveProperty('refreshToken', 'token')
          expect(result).toHaveProperty('expiresIn', 86400)

          // Verify payload structure
          expect(mockJwtService.sign).toHaveBeenCalledWith(
            {
              sub: userId,
              email,
              role,
            },
            { expiresIn: '24h' }
          )
        }),
        { numRuns: 50 }
      )
    })
  })

  /**
   * **Property: User Validation Consistency**
   *
   * For any valid user ID, validateUser should return the user if found,
   * or throw UnauthorizedException if not found.
   */
  describe('Property: User Validation Consistency', () => {
    it('should validate existing users and reject non-existing ones', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, fc.boolean(), async (userId, userExists) => {
          const mockUser = userExists ? { id: userId } : null
          mockUserRepository.findOne.mockResolvedValue(mockUser)

          if (userExists) {
            // Property: Valid user ID returns user
            const result = await service.validateUser(userId)
            expect(result).toEqual(mockUser)
          } else {
            // Property: Invalid user ID throws exception
            await expect(service.validateUser(userId)).rejects.toThrow(UnauthorizedException)
          }

          expect(mockUserRepository.findOne).toHaveBeenCalledWith({
            where: { id: userId },
          })
        }),
        { numRuns: 30 }
      )
    })
  })
})
