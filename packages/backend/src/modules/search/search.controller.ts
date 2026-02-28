import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common'
import { SearchService } from './search.service'
import { SearchProfessionalsDto } from './dto/search-professionals.dto'
import { RecommendedProfessionalsDto } from './dto/recommended-professionals.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('professionals')
  async searchProfessionals(@Body() dto: SearchProfessionalsDto) {
    return this.searchService.searchProfessionals(dto)
  }

  @Post('recommended')
  @UseGuards(JwtAuthGuard)
  async getRecommendedProfessionals(@Body() dto: RecommendedProfessionalsDto) {
    return this.searchService.getRecommendedProfessionals(dto)
  }

  @Get('professionals/:id/availability')
  async checkAvailability(
    @Param('id') professionalId: string,
    @Query('date') date: string,
    @Query('duration') duration: string
  ) {
    const parsedDate = new Date(date)
    const parsedDuration = parseInt(duration, 10)

    return this.searchService.checkAvailability(professionalId, parsedDate, parsedDuration)
  }
}
