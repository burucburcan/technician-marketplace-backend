import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { AuthenticatedRequest } from '../../common/types/request.types'
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto'
import { THROTTLE_AUTH } from '../../common/decorators/throttle.decorator'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @THROTTLE_AUTH()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @THROTTLE_AUTH()
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get('User-Agent')
    return this.authService.login(loginDto, ipAddress, userAgent)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    // Extract session ID from Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const sessionId = authHeader.substring(7)
      await this.authService.logout(sessionId)
    }
    return { message: 'Logged out successfully' }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.userId
    await this.authService.logoutAllSessions(userId)
    return { message: 'Logged out from all sessions successfully' }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @THROTTLE_AUTH()
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token)
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @THROTTLE_AUTH()
  async resendVerification(@Body() resendDto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(resendDto.email)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @THROTTLE_AUTH()
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @THROTTLE_AUTH()
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword)
  }
}
