import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { User } from '../../entities/user.entity'
import { UserRole } from '../../common/enums'
import { RegisterDto, LoginDto } from './dto'

describe('AuthService', () => {
  let service: AuthService

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
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
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)

    // Reset mocks
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      role: UserRole.USER,
    }

    it('should successfully register a new user', async () => {
      const mockUser = {
        id: '123',
        email: registerDto.email,
        passwordHash: 'hashed_password',
        role: UserRole.USER,
        isEmailVerified: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserRepository.findOne.mockResolvedValue(null)
      mockUserRepository.create.mockReturnValue(mockUser)
      mockUserRepository.save.mockResolvedValue(mockUser)
      mockJwtService.sign.mockReturnValue('mock_token')

      const result = await service.register(registerDto)

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      })
      expect(mockUserRepository.create).toHaveBeenCalled()
      expect(mockUserRepository.save).toHaveBeenCalled()
      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user.email).toBe(registerDto.email)
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = {
        id: '123',
        email: registerDto.email,
      }

      mockUserRepository.findOne.mockResolvedValue(existingUser)

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException)
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      })
      expect(mockUserRepository.create).not.toHaveBeenCalled()
    })

    it('should hash the password before saving', async () => {
      const mockUser = {
        id: '123',
        email: registerDto.email,
        passwordHash: 'hashed_password',
        role: UserRole.USER,
        isEmailVerified: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserRepository.findOne.mockResolvedValue(null)
      mockUserRepository.create.mockReturnValue(mockUser)
      mockUserRepository.save.mockResolvedValue(mockUser)
      mockJwtService.sign.mockReturnValue('mock_token')

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash')

      await service.register(registerDto)

      expect(bcryptHashSpy).toHaveBeenCalledWith(registerDto.password, 10)
    })

    it('should set default role to USER if not provided', async () => {
      const registerDtoWithoutRole = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: '123',
        email: registerDtoWithoutRole.email,
        passwordHash: 'hashed_password',
        role: UserRole.USER,
        isEmailVerified: false,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserRepository.findOne.mockResolvedValue(null)
      mockUserRepository.create.mockReturnValue(mockUser)
      mockUserRepository.save.mockResolvedValue(mockUser)
      mockJwtService.sign.mockReturnValue('mock_token')

      const result = await service.register(registerDtoWithoutRole)

      expect(result.user.role).toBe(UserRole.USER)
    })
  })

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    }

    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: '123',
        email: loginDto.email,
        passwordHash: await bcrypt.hash(loginDto.password, 10),
        role: UserRole.USER,
        isEmailVerified: true,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockJwtService.sign.mockReturnValue('mock_token')

      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)

      const result = await service.login(loginDto)

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      })
      expect(bcryptCompareSpy).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash)
      expect(result).toHaveProperty('user')
      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user.email).toBe(loginDto.email)
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: loginDto.email },
      })
    })

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: '123',
        email: loginDto.email,
        passwordHash: 'hashed_password',
        role: UserRole.USER,
      }

      mockUserRepository.findOne.mockResolvedValue(mockUser)

      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
      expect(bcryptCompareSpy).toHaveBeenCalledWith(loginDto.password, mockUser.passwordHash)
    })
  })

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      } as User

      mockJwtService.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token')

      const result = service.generateTokens(mockUser)

      expect(result).toHaveProperty('accessToken', 'access_token')
      expect(result).toHaveProperty('refreshToken', 'refresh_token')
      expect(result).toHaveProperty('expiresIn', 86400)
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2)
    })

    it('should include user info in token payload', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      } as User

      mockJwtService.sign.mockReturnValue('token')

      service.generateTokens(mockUser)

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        { expiresIn: '24h' }
      )
    })
  })

  describe('validateUser', () => {
    it('should return user if found', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        role: UserRole.USER,
      } as User

      mockUserRepository.findOne.mockResolvedValue(mockUser)

      const result = await service.validateUser('123')

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '123' },
      })
    })

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.validateUser('123')).rejects.toThrow(UnauthorizedException)
    })
  })
})
