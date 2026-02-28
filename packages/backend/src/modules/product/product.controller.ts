import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  Put,
  Delete,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ProductService } from './product.service'
import { ProductRatingService } from './product-rating.service'
import { ProductSearchQueryDto } from './dto/product-search-query.dto'
import { ProductFiltersDto } from './dto/product-filters.dto'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderStatusDto } from './dto/update-order-status.dto'
import { AddTrackingInfoDto } from './dto/add-tracking-info.dto'
import { CancelOrderDto } from './dto/cancel-order.dto'
import { CreateProductReviewDto } from './dto/create-product-review.dto'
import { UpdateProductReviewDto } from './dto/update-product-review.dto'
import { ReplyToReviewDto } from './dto/reply-to-review.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { OrderStatus } from '../../common/enums'
import { AuthenticatedRequest } from '../../common/types/request.types'

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly productRatingService: ProductRatingService
  ) {}

  @Post('search')
  async searchProducts(@Body() dto: ProductSearchQueryDto) {
    return this.productService.searchProducts(dto)
  }

  @Get('category/:category')
  async getProductsByCategory(
    @Param('category') category: string,
    @Query() filters: ProductFiltersDto
  ) {
    return this.productService.getProductsByCategory(category, filters)
  }

  @Get(':id')
  async getProductDetails(@Param('id') id: string) {
    return this.productService.getProductDetails(id)
  }

  // Product Reviews
  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  async createProductReview(@Req() req: AuthenticatedRequest, @Body() dto: CreateProductReviewDto) {
    const userId = req.user.userId
    return this.productRatingService.createProductReview(userId, dto)
  }

  @Get(':id/reviews')
  async getProductReviews(
    @Param('id') productId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    return this.productRatingService.getProductReviews(productId, page, pageSize)
  }

  @Get(':id/reviews/stats')
  async getProductRatingStats(@Param('id') productId: string) {
    return this.productRatingService.getProductRatingStats(productId)
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  async createOrder(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    const userId = req.user.userId
    return this.productService.createOrder(userId, dto)
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const requestingUserId = req.user.userId
    return this.productService.getOrder(id, requestingUserId)
  }

  @Put('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateOrderStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto
  ) {
    const requestingUserId = req.user.userId
    const requestingSupplierId = req.user.supplierId
    return this.productService.updateOrderStatus(id, dto, requestingUserId, requestingSupplierId)
  }

  @Post('orders/:id/tracking')
  @UseGuards(JwtAuthGuard)
  async addTrackingInfo(@Param('id') id: string, @Body() dto: AddTrackingInfoDto) {
    return this.productService.addTrackingInfo(id, dto.trackingNumber, dto.carrier)
  }

  @Get('orders/:id/tracking')
  @UseGuards(JwtAuthGuard)
  async getTrackingInfo(@Param('id') id: string) {
    return this.productService.getTrackingInfo(id)
  }

  @Put('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.productService.cancelOrder(id, dto.reason)
  }
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly productRatingService: ProductRatingService) {}

  @Put(':id')
  async updateProductReview(
    @Req() req: AuthenticatedRequest,
    @Param('id') reviewId: string,
    @Body() dto: UpdateProductReviewDto
  ) {
    const userId = req.user.userId
    return this.productRatingService.updateProductReview(reviewId, userId, dto)
  }

  @Delete(':id')
  async deleteProductReview(@Req() req: AuthenticatedRequest, @Param('id') reviewId: string) {
    const userId = req.user.userId
    await this.productRatingService.deleteProductReview(reviewId, userId)
    return { message: 'Review deleted successfully' }
  }

  @Post(':id/reply')
  async replyToReview(
    @Req() req: AuthenticatedRequest,
    @Param('id') reviewId: string,
    @Body() dto: ReplyToReviewDto
  ) {
    const supplierId = req.user.supplierId
    if (!supplierId) {
      throw new BadRequestException('Only suppliers can reply to reviews')
    }
    return this.productRatingService.replyToReview(reviewId, supplierId, dto)
  }
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserOrderController {
  constructor(private readonly productService: ProductService) {}

  @Get(':id/orders')
  async getUserOrders(
    @Req() req: AuthenticatedRequest,
    @Param('id') userId: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    const requestingUserId = req.user.userId
    return this.productService.getUserOrders(userId, requestingUserId, status, page, pageSize)
  }
}

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierOrderController {
  constructor(private readonly productService: ProductService) {}

  @Get(':id/orders')
  async getSupplierOrders(
    @Req() req: AuthenticatedRequest,
    @Param('id') supplierId: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number
  ) {
    const requestingSupplierId = req.user.supplierId
    if (!requestingSupplierId) {
      throw new ForbiddenException('Only suppliers can access supplier orders')
    }
    return this.productService.getSupplierOrders(
      supplierId,
      requestingSupplierId,
      status,
      page,
      pageSize
    )
  }
}
