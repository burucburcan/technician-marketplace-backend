import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { Product } from '../../entities/product.entity'

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name)

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) {}

  async addToCart(userId: string, productId: string, quantity: number): Promise<Cart> {
    // Validate product exists and is available
    const product = await this.productRepository.findOne({
      where: { id: productId },
    })

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`)
    }

    if (!product.isAvailable) {
      throw new BadRequestException('Product is not available')
    }

    if (product.stockQuantity < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.stockQuantity}`)
    }

    // Get or create cart for user
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    })

    if (!cart) {
      cart = this.cartRepository.create({
        userId,
        subtotal: 0,
        total: 0,
        currency: 'MXN',
      })
      cart = await this.cartRepository.save(cart)
    }

    // Check if product already in cart
    const existingItem = cart.items?.find(item => item.productId === productId)

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity

      if (product.stockQuantity < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stockQuantity}, Current in cart: ${existingItem.quantity}`
        )
      }

      existingItem.quantity = newQuantity
      existingItem.subtotal = Number(product.price) * newQuantity
      await this.cartItemRepository.save(existingItem)
    } else {
      // Add new item
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId,
        quantity,
        price: product.price,
        subtotal: Number(product.price) * quantity,
      })
      await this.cartItemRepository.save(cartItem)
    }

    // Recalculate cart totals
    await this.recalculateCartTotals(cart.id)

    // Return updated cart
    return this.getCart(userId)
  }

  async updateCartItem(userId: string, cartItemId: string, quantity: number): Promise<Cart> {
    // Get cart item
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart', 'product'],
    })

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`)
    }

    // Verify cart belongs to user
    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to user')
    }

    // Validate stock
    if (cartItem.product.stockQuantity < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${cartItem.product.stockQuantity}`
      )
    }

    // Update quantity and subtotal
    cartItem.quantity = quantity
    cartItem.subtotal = Number(cartItem.product.price) * quantity
    await this.cartItemRepository.save(cartItem)

    // Recalculate cart totals
    await this.recalculateCartTotals(cartItem.cartId)

    // Return updated cart
    return this.getCart(userId)
  }

  async removeFromCart(userId: string, cartItemId: string): Promise<Cart> {
    // Get cart item
    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId },
      relations: ['cart'],
    })

    if (!cartItem) {
      throw new NotFoundException(`Cart item with ID ${cartItemId} not found`)
    }

    // Verify cart belongs to user
    if (cartItem.cart.userId !== userId) {
      throw new BadRequestException('Cart item does not belong to user')
    }

    const cartId = cartItem.cartId

    // Remove item
    await this.cartItemRepository.remove(cartItem)

    // Recalculate cart totals
    await this.recalculateCartTotals(cartId)

    // Return updated cart
    return this.getCart(userId)
  }

  async getCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product', 'items.product.images'],
    })

    if (!cart) {
      // Create empty cart if doesn't exist
      cart = this.cartRepository.create({
        userId,
        subtotal: 0,
        total: 0,
        currency: 'MXN',
        items: [],
      })
      cart = await this.cartRepository.save(cart)
    }

    return cart
  }

  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items'],
    })

    if (!cart) {
      return
    }

    // Remove all items
    if (cart.items && cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items)
    }

    // Reset cart totals
    cart.subtotal = 0
    cart.total = 0
    await this.cartRepository.save(cart)

    this.logger.log(`Cleared cart for user ${userId}`)
  }

  private async recalculateCartTotals(cartId: string): Promise<void> {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: ['items'],
    })

    if (!cart) {
      return
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)

    cart.subtotal = subtotal
    cart.total = subtotal // For now, total = subtotal (no taxes or shipping)

    await this.cartRepository.save(cart)

    this.logger.log(`Recalculated cart ${cartId}: subtotal=${subtotal}, total=${cart.total}`)
  }
}
