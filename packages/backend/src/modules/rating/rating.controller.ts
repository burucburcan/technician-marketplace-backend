import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { RatingService } from './rating.service'
import { CreateRatingDto } from './dto/create-rating.dto'
import { ReportRatingDto } from './dto/report-rating.dto'
import { ModerateRatingDto } from './dto/moderate-rating.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../common/enums/user-role.enum'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('ratings')
@UseGuards(JwtAuthGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createRating(@Request() req: RequestWithUser, @Body() createRatingDto: CreateRatingDto) {
    const userId = req.user.userId
    return this.ratingService.createRating(userId, createRatingDto)
  }

  @Get('professionals/:professionalId/ratings')
  @HttpCode(HttpStatus.OK)
  async getProfessionalRatings(
    @Param('professionalId') professionalId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1
    const limitNum = limit ? parseInt(limit, 10) : 10
    return this.ratingService.getProfessionalRatings(professionalId, pageNum, limitNum)
  }

  @Get('professionals/:professionalId/stats')
  @HttpCode(HttpStatus.OK)
  async getProfessionalStats(@Param('professionalId') professionalId: string) {
    return this.ratingService.getProfessionalRatingStats(professionalId)
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getRating(@Param('id') id: string) {
    return this.ratingService.findById(id)
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.OK)
  async reportRating(@Param('id') id: string, @Body() reportDto: ReportRatingDto) {
    return this.ratingService.reportRating(id)
  }

  @Put(':id/moderate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async moderateRating(@Param('id') id: string, @Body() moderateDto: ModerateRatingDto) {
    return this.ratingService.moderateRating(id, moderateDto)
  }
}
