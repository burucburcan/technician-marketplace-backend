import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ProviderService } from './provider.service'
import {
  CreateProfessionalDto,
  UpdateProfessionalDto,
  ProfessionalFilterDto,
  VerifyProfessionalDto,
  ProviderStatsQueryDto,
} from './dto'
import { RequestWithUser } from '../../common/types/request.types'
import { UserRole } from '../../common/enums'
import { ForbiddenException } from '@nestjs/common'

@Controller('providers')
@UseGuards(JwtAuthGuard)
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  private verifyProviderRole(user: any, providerId: string) {
    if (user.role !== UserRole.PROVIDER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only providers can access this resource')
    }

    // Providers can only access their own resources (admins can access all)
    if (user.role === UserRole.PROVIDER && user.userId !== providerId) {
      throw new ForbiddenException('You can only manage your own professionals')
    }
  }

  @Get(':id/professionals')
  async getProfessionals(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Query() filters: ProfessionalFilterDto,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.getProfessionals(providerId, filters)
  }

  @Get(':id/professionals/:professionalId')
  async getProfessional(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.getProfessional(providerId, professionalId)
  }

  @Post(':id/professionals')
  async createProfessional(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Body() createProfessionalDto: CreateProfessionalDto,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.createProfessional(providerId, createProfessionalDto)
  }

  @Put(':id/professionals/:professionalId')
  async updateProfessional(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() updateProfessionalDto: UpdateProfessionalDto,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.updateProfessional(
      providerId,
      professionalId,
      updateProfessionalDto
    )
  }

  @Delete(':id/professionals/:professionalId')
  async deleteProfessional(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.deleteProfessional(providerId, professionalId)
  }

  @Put(':id/professionals/:professionalId/verify')
  async verifyProfessional(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Body() verifyProfessionalDto: VerifyProfessionalDto,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.verifyProfessional(
      providerId,
      professionalId,
      verifyProfessionalDto
    )
  }

  @Get(':id/stats')
  async getProviderStats(
    @Param('id', ParseUUIDPipe) providerId: string,
    @Query() query: ProviderStatsQueryDto,
    @Request() req: RequestWithUser
  ) {
    this.verifyProviderRole(req.user, providerId)
    return this.providerService.getProviderStats(providerId, query)
  }
}
