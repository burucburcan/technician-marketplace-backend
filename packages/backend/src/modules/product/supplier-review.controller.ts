import { Controller, Post, Get, Body, Param, Query, Req, UseGuards } from '@nestjs/common'
import { ProductRatingService } from './product-rating.service'
import { CreateSupplierReviewDto } from './dto/create-supplier-review.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { AuthenticatedRequest } from '../../common/types/request.types'

@Controller('suppliers')
export class SupplierReviewController {
  constructor(private readonly productRatingService: ProductRatingService) {}

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  async createSupplierReview(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierReviewDto) {
    const userId = req.user.userId
    return this.productRatingService.createSupplierReview(userId, dto)
  }

  @Get(':id/reviews')
  async getSupplierReviews(
    @Param('id') supplierId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    return this.productRatingService.getSupplierReviews(supplierId, page, pageSize)
  }

  @Get(':id/reviews/stats')
  async getSupplierRatingStats(@Param('id') supplierId: string) {
    return this.productRatingService.getSupplierRatingStats(supplierId)
  }
}
