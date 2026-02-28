import { Controller, Post, Put, Delete, Get, Body, Param, UseGuards, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CartService } from './cart.service'
import { AddToCartDto } from './dto/add-to-cart.dto'
import { UpdateCartItemDto } from './dto/update-cart-item.dto'

interface RequestWithUser {
  user: {
    userId: string
  }
}

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('items')
  async addToCart(@Request() req: RequestWithUser, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, dto.productId, dto.quantity)
  }

  @Put('items/:id')
  async updateCartItem(
    @Request() req: RequestWithUser,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto
  ) {
    return this.cartService.updateCartItem(req.user.userId, cartItemId, dto.quantity)
  }

  @Delete('items/:id')
  async removeFromCart(@Request() req: RequestWithUser, @Param('id') cartItemId: string) {
    return this.cartService.removeFromCart(req.user.userId, cartItemId)
  }

  @Get()
  async getCart(@Request() req: RequestWithUser) {
    return this.cartService.getCart(req.user.userId)
  }

  @Delete()
  async clearCart(@Request() req: RequestWithUser) {
    await this.cartService.clearCart(req.user.userId)
    return { message: 'Cart cleared successfully' }
  }
}
