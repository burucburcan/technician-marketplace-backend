import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { User } from '../../entities/user.entity'
import { UserLockout } from '../../entities/user-lockout.entity'
import { RegisterDto, LoginDto } from './dto'
import { UserRole } from '../../common/enums'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { SessionService } from '../session/session.service'

@Injectable()
export class AuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserLockout)
    private readonly userLockoutRepository: Repository<UserLockout>,
    private readonly jwtService: JwtService,
    private readonly activityLogService: ActivityLogService,
    private readonly sessionService: SessionService
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, role } = registerDto

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    })

    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      role: role || UserRole.USER,
      isEmailVerified: false,
    })

    await this.userRepository.save(user)

    // Generate email verification token
    const verificationToken = this.generateEmailVerificationToken(user.id)

    // TODO: Send verification email (will be implemented in task 3.3)

    // Generate auth tokens
    const tokens = await this.generateTokens(user)

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      verificationToken, // For testing purposes
    }
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    })

    if (!user) {
      // Log failed login attempt
      await this.activityLogService.logActivity({
        action: 'failed_login',
        resource: 'auth',
        metadata: { email, reason: 'user_not_found' },
        ipAddress,
        userAgent,
      })
      throw new UnauthorizedException('Invalid credentials')
    }

    // Check if user is locked out
    await this.checkUserLockout(user.id)

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      // Log failed login attempt
      await this.activityLogService.logActivity({
        userId: user.id,
        action: 'failed_login',
        resource: 'auth',
        metadata: { email, reason: 'invalid_password' },
        ipAddress,
        userAgent,
      })

      // Handle failed attempt and potential lockout
      await this.handleFailedLoginAttempt(user.id)

      throw new UnauthorizedException('Invalid credentials')
    }

    // Reset failed attempts on successful login
    await this.resetFailedAttempts(user.id)

    // Log successful login
    await this.activityLogService.logActivity({
      userId: user.id,
      action: 'successful_login',
      resource: 'auth',
      metadata: { email },
      ipAddress,
      userAgent,
    })

    // Generate tokens and create session
    const tokens = await this.generateTokens(user)

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    }
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    return user
  }

  async verifyEmail(token: string) {
    try {
      // Verify token
      const payload = this.jwtService.verify(token)

      if (payload.type !== 'email_verification') {
        throw new BadRequestException('Invalid verification token')
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new BadRequestException('User not found')
      }

      if (user.isEmailVerified) {
        return {
          message: 'Email already verified',
          user: this.sanitizeUser(user),
        }
      }

      // Update user
      user.isEmailVerified = true
      await this.userRepository.save(user)

      return {
        message: 'Email verified successfully',
        user: this.sanitizeUser(user),
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Verification token has expired')
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid verification token')
      }
      throw error
    }
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified')
    }

    const verificationToken = this.generateEmailVerificationToken(user.id)

    // TODO: Send verification email via SendGrid

    return {
      message: 'Verification email sent',
      verificationToken, // For testing purposes
    }
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
    })

    // Don't reveal if user exists or not for security
    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent',
      }
    }

    const resetToken = this.generatePasswordResetToken(user.id)

    // TODO: Send password reset email via SendGrid

    return {
      message: 'If the email exists, a password reset link has been sent',
      resetToken, // For testing purposes
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify token
      const payload = this.jwtService.verify(token)

      if (payload.type !== 'password_reset') {
        throw new BadRequestException('Invalid reset token')
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      })

      if (!user) {
        throw new BadRequestException('User not found')
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 10)

      // Update user
      user.passwordHash = passwordHash
      await this.userRepository.save(user)

      return {
        message: 'Password reset successfully',
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset token has expired')
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token')
      }
      throw error
    }
  }

  async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '24h',
    })

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    })

    // Create session in Redis
    await this.sessionService.createSession(accessToken, {
      userId: user.id,
      email: user.email,
      role: user.role,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    })

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours in seconds
    }
  }

  async logout(sessionId: string): Promise<void> {
    // Delete session from Redis
    await this.sessionService.deleteSession(sessionId)
  }

  async logoutAllSessions(userId: string): Promise<void> {
    // Delete all sessions for the user
    await this.sessionService.deleteUserSessions(userId)
  }

  generateEmailVerificationToken(userId: string): string {
    return this.jwtService.sign({ sub: userId, type: 'email_verification' }, { expiresIn: '24h' })
  }

  generatePasswordResetToken(userId: string): string {
    return this.jwtService.sign({ sub: userId, type: 'password_reset' }, { expiresIn: '1h' })
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, twoFactorSecret, ...sanitized } = user
    return sanitized
  }

  private async checkUserLockout(userId: string): Promise<void> {
    const activeLockout = await this.userLockoutRepository.findOne({
      where: {
        userId,
        isActive: true,
        lockedUntil: MoreThan(new Date()),
      },
    })

    if (activeLockout) {
      throw new HttpException(
        `Account is locked until ${activeLockout.lockedUntil.toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS
      )
    }
  }

  private async handleFailedLoginAttempt(userId: string): Promise<void> {
    // Get current lockout record or create new one
    let lockout = await this.userLockoutRepository.findOne({
      where: { userId, isActive: true },
    })

    if (!lockout) {
      lockout = this.userLockoutRepository.create({
        userId,
        failedAttempts: 1,
        lockedUntil: new Date(),
        isActive: true,
      })
    } else {
      lockout.failedAttempts += 1
    }

    // Lock account if max attempts reached
    if (lockout.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      lockout.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION)

      // Send lockout notification email
      const user = await this.userRepository.findOne({ where: { id: userId } })
      if (user) {
        // TODO: Send lockout notification email
        await this.activityLogService.logActivity({
          userId,
          action: 'account_locked',
          resource: 'auth',
          metadata: {
            email: user.email,
            failedAttempts: lockout.failedAttempts,
            lockedUntil: lockout.lockedUntil,
          },
        })
      }
    }

    await this.userLockoutRepository.save(lockout)
  }

  private async resetFailedAttempts(userId: string): Promise<void> {
    await this.userLockoutRepository.update({ userId, isActive: true }, { isActive: false })
  }
}
