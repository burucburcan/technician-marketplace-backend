import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto'
import { UserRole } from '../../common/enums'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)

    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('register', () => {
    it('should call authService.register with correct parameters', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER,
      }

      const mockResponse = {
        user: {
          id: '123',
          email: registerDto.email,
          role: UserRole.USER,
          isEmailVerified: false,
        },
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 86400,
      }

      mockAuthService.register.mockResolvedValue(mockResponse)

      const result = await controller.register(registerDto)

      expect(authService.register).toHaveBeenCalledWith(registerDto)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockResponse = {
        user: {
          id: '123',
          email: loginDto.email,
          role: UserRole.USER,
          isEmailVerified: true,
        },
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        expiresIn: 86400,
      }

      mockAuthService.login.mockResolvedValue(mockResponse)

      const result = await controller.login(loginDto, {
        ip: '127.0.0.1',
        get: () => 'test-agent',
      } as any)

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, '127.0.0.1', 'test-agent')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with correct token', async () => {
      const verifyEmailDto: VerifyEmailDto = {
        token: 'verification_token',
      }

      const mockResponse = {
        message: 'Email verified successfully',
        user: {
          id: '123',
          email: 'test@example.com',
          isEmailVerified: true,
        },
      }

      mockAuthService.verifyEmail.mockResolvedValue(mockResponse)

      const result = await controller.verifyEmail(verifyEmailDto)

      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyEmailDto.token)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('resendVerification', () => {
    it('should call authService.resendVerificationEmail with correct email', async () => {
      const resendDto: ResendVerificationDto = {
        email: 'test@example.com',
      }

      const mockResponse = {
        message: 'Verification email sent',
      }

      mockAuthService.resendVerificationEmail.mockResolvedValue(mockResponse)

      const result = await controller.resendVerification(resendDto)

      expect(authService.resendVerificationEmail).toHaveBeenCalledWith(resendDto.email)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword with correct email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      }

      const mockResponse = {
        message: 'If the email exists, a password reset link has been sent',
      }

      mockAuthService.forgotPassword.mockResolvedValue(mockResponse)

      const result = await controller.forgotPassword(forgotPasswordDto)

      expect(authService.forgotPassword).toHaveBeenCalledWith(forgotPasswordDto.email)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('resetPassword', () => {
    it('should call authService.resetPassword with correct parameters', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        token: 'reset_token',
        newPassword: 'newPassword123',
      }

      const mockResponse = {
        message: 'Password reset successfully',
      }

      mockAuthService.resetPassword.mockResolvedValue(mockResponse)

      const result = await controller.resetPassword(resetPasswordDto)

      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetPasswordDto.token,
        resetPasswordDto.newPassword
      )
      expect(result).toEqual(mockResponse)
    })
  })
})
