import {
  Controller,
  Get,
  Put,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserService } from './user.service'
import {
  CreateUserProfileDto,
  UpdateUserProfileDto,
  CreateProfessionalProfileDto,
  UpdateProfessionalProfileDto,
  UploadCertificateDto,
  UploadPortfolioImageDto,
  UpdatePortfolioImageDto,
  UpdatePreferencesDto,
  UpdateLocationDto,
} from './dto'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id/profile')
  async getProfile(@Param('id', ParseUUIDPipe) userId: string) {
    return this.userService.getProfile(userId)
  }

  @Post(':id/profile')
  async createProfile(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() createProfileDto: CreateUserProfileDto
  ) {
    return this.userService.createProfile(userId, createProfileDto)
  }

  @Put(':id/profile')
  async updateProfile(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updateProfileDto: UpdateUserProfileDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.updateProfile(userId, updateProfileDto, req.user.userId)
  }

  @Put(':id/preferences')
  async updatePreferences(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.updatePreferences(userId, updatePreferencesDto, req.user.userId)
  }

  @Post(':id/profile/photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePhoto(
    @Param('id', ParseUUIDPipe) userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser
  ) {
    return this.userService.uploadProfilePhoto(userId, file, req.user.userId)
  }

  @Delete(':id')
  async deleteAccount(@Param('id', ParseUUIDPipe) userId: string, @Request() req: RequestWithUser) {
    return this.userService.deleteAccount(userId, req.user.userId)
  }

  @Get(':id/export')
  async exportUserData(
    @Param('id', ParseUUIDPipe) userId: string,
    @Request() req: RequestWithUser
  ) {
    return this.userService.exportUserData(userId, req.user.userId)
  }

  // Professional Profile Endpoints

  @Post('professionals/profile')
  async createProfessionalProfile(
    @Body() createProfessionalProfileDto: CreateProfessionalProfileDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.createProfessionalProfile(req.user.userId, createProfessionalProfileDto)
  }

  @Put('professionals/:id/profile')
  async updateProfessionalProfile(
    @Param('id', ParseUUIDPipe) professionalId: string,
    @Body() updateProfessionalProfileDto: UpdateProfessionalProfileDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.updateProfessionalProfile(
      professionalId,
      updateProfessionalProfileDto,
      req.user.userId
    )
  }

  @Get('professionals/:id/profile')
  async getProfessionalProfile(@Param('id', ParseUUIDPipe) professionalId: string) {
    return this.userService.getProfessionalProfile(professionalId)
  }

  // Certificate Management Endpoints

  @Post('professionals/:id/certificates')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @Param('id', ParseUUIDPipe) professionalId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadCertificateDto: UploadCertificateDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.uploadCertificate(
      professionalId,
      file,
      uploadCertificateDto,
      req.user.userId
    )
  }

  @Get('professionals/:id/certificates')
  async getCertificates(@Param('id', ParseUUIDPipe) professionalId: string) {
    return this.userService.getCertificates(professionalId)
  }

  // Portfolio Management Endpoints (Artist-specific)

  @Post('artists/:id/portfolio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPortfolioImage(
    @Param('id', ParseUUIDPipe) artistId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPortfolioImageDto: UploadPortfolioImageDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.uploadPortfolioImage(
      artistId,
      file,
      uploadPortfolioImageDto,
      req.user.userId
    )
  }

  @Delete('artists/:id/portfolio/:imageId')
  async deletePortfolioImage(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Request() req: RequestWithUser
  ) {
    return this.userService.deletePortfolioImage(artistId, imageId, req.user.userId)
  }

  @Get('artists/:id/portfolio')
  async getPortfolio(@Param('id', ParseUUIDPipe) artistId: string) {
    return this.userService.getPortfolio(artistId)
  }

  @Put('artists/:id/portfolio/:imageId')
  async updatePortfolioImage(
    @Param('id', ParseUUIDPipe) artistId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body() updatePortfolioImageDto: UpdatePortfolioImageDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.updatePortfolioImage(
      artistId,
      imageId,
      updatePortfolioImageDto,
      req.user.userId
    )
  }

  // Professional Location Update Endpoint

  @Put('professionals/:id/location')
  async updateProfessionalLocation(
    @Param('id', ParseUUIDPipe) professionalId: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Request() req: RequestWithUser
  ) {
    return this.userService.updateProfessionalLocation(
      professionalId,
      updateLocationDto,
      req.user.userId
    )
  }
}
