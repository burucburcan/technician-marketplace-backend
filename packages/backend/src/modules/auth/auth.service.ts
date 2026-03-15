import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { RegisterDto, LoginDto } from './dto'
import { UserRole } from '../../common/enums'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly jwtService: JwtService
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName, role } = registerDto

    // Validate role for public registration
    const allowedPublicRoles = [UserRole.PROFESSIONAL, UserRole.USER]
    if (role && !allowedPublicRoles.includes(role)) {
      throw new BadRequestException('Invalid role for public registration')
    }

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

    // Create user profile
    const userProfile = this.userProfileRepository.create({
      userId: user.id,
      firstName,
      lastName,
      phone: '',
      language: 'es',
      location: {
        address: '',
        city: '',
        state: '',
        country: '',
        postalCode: '',
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
      },
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        currency: 'MXN',
      },
    })

    await this.userProfileRepository.save(userProfile)

    // Generate auth tokens
    const tokens = await this.generateTokens(user)

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Generate tokens
    const tokens = await this.generateTokens(user)

    return {
      user: this.sanitizeUser(user),
      ...tokens,
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

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400,
    }
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, twoFactorSecret, ...sanitized } = user
    return sanitized
  }
}
