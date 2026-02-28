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
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../common/enums/user-role.enum'
import { AdminService } from './admin.service'
import {
  ListUsersDto,
  ListProvidersDto,
  ListProfessionalsDto,
  SuspendUserDto,
  ListCategoriesDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  GetPlatformStatsDto,
  ListDisputesDto,
  ResolveDisputeDto,
  ListPendingPortfoliosDto,
  ApprovePortfolioDto,
  RejectPortfolioDto,
} from './dto'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @HttpCode(HttpStatus.OK)
  async listUsers(@Query() filters: ListUsersDto) {
    return this.adminService.listUsers(filters)
  }

  @Put('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() suspendUserDto: SuspendUserDto,
    @Request() req: RequestWithUser
  ) {
    return this.adminService.suspendUser(userId, suspendUserDto, req.user.userId)
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id', ParseUUIDPipe) userId: string, @Request() req: RequestWithUser) {
    return this.adminService.deleteUser(userId, req.user.userId)
  }

  @Get('providers')
  @HttpCode(HttpStatus.OK)
  async listProviders(@Query() filters: ListProvidersDto) {
    return this.adminService.listProviders(filters)
  }

  @Get('professionals')
  @HttpCode(HttpStatus.OK)
  async listProfessionals(@Query() filters: ListProfessionalsDto) {
    return this.adminService.listProfessionals(filters)
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async listCategories(@Query() filters: ListCategoriesDto) {
    return this.adminService.listCategories(filters)
  }

  @Get('categories/:id')
  @HttpCode(HttpStatus.OK)
  async getCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getCategory(id)
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() body: CreateCategoryDto, @Request() req: RequestWithUser) {
    return this.adminService.createCategory(body, req.user.userId)
  }

  @Put('categories/:id')
  @HttpCode(HttpStatus.OK)
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDto,
    @Request() req: RequestWithUser
  ) {
    return this.adminService.updateCategory(id, body, req.user.userId)
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCategory(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser) {
    return this.adminService.deleteCategory(id, req.user.userId)
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getPlatformStats(@Query() filters: GetPlatformStatsDto, @Request() req: RequestWithUser) {
    return this.adminService.getPlatformStats(filters, req.user.userId)
  }

  @Get('disputes')
  @HttpCode(HttpStatus.OK)
  async listDisputes(@Query() filters: ListDisputesDto, @Request() req: RequestWithUser) {
    return this.adminService.listDisputes(filters, req.user.userId)
  }

  @Get('disputes/:id')
  @HttpCode(HttpStatus.OK)
  async getDisputeDetails(@Param('id', ParseUUIDPipe) id: string, @Request() req: RequestWithUser) {
    return this.adminService.getDisputeDetails(id, req.user.userId)
  }

  @Put('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResolveDisputeDto,
    @Request() req: RequestWithUser
  ) {
    return this.adminService.resolveDispute(id, body, req.user.userId)
  }

  @Get('portfolios/pending')
  @HttpCode(HttpStatus.OK)
  async listPendingPortfolios(
    @Query() filters: ListPendingPortfoliosDto,
    @Request() req: RequestWithUser
  ) {
    return this.adminService.listPendingPortfolios(filters, req.user.userId)
  }

  @Put('portfolios/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePortfolio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApprovePortfolioDto,
    @Request() req: RequestWithUser
  ) {
    return this.adminService.approvePortfolio(id, body, req.user.userId)
  }

  @Put('portfolios/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectPortfolio(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RejectPortfolioDto,
    @Request() req: RequestWithUser
  ) {
    return this.adminService.rejectPortfolio(id, body, req.user.userId)
  }
}
