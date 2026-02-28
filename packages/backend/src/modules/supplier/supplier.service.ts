import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { User } from '../../entities/user.entity'
import { Order } from '../../entities/order.entity'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import {
  CreateSupplierProfileDto,
  UpdateSupplierProfileDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  UpdatePriceDto,
  ReorderImagesDto,
} from './dto'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { UserRole, OrderStatus } from '../../common/enums'

const LOW_STOCK_THRESHOLD = 10

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(SupplierProfile)
    private readonly supplierProfileRepository: Repository<SupplierProfile>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly activityLogService: ActivityLogService,
    private readonly s3Service: S3Service
  ) {}

  // Supplier Profile Management
  async createSupplierProfile(
    userId: string,
    createSupplierProfileDto: CreateSupplierProfileDto
  ): Promise<SupplierProfile> {
    // Verify user exists and has supplier role
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.SUPPLIER },
    })

    if (!user) {
      throw new NotFoundException('User not found or is not a supplier')
    }

    // Check if supplier profile already exists
    const existingProfile = await this.supplierProfileRepository.findOne({
      where: { userId },
    })

    if (existingProfile) {
      throw new BadRequestException('Supplier profile already exists for this user')
    }

    // Create supplier profile
    const supplierProfile = this.supplierProfileRepository.create({
      userId,
      ...createSupplierProfileDto,
    })

    const savedProfile = await this.supplierProfileRepository.save(supplierProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId,
      action: 'supplier_profile_created',
      resource: 'supplier_profile',
      metadata: {
        supplierId: savedProfile.id,
      },
    })

    return savedProfile
  }

  async updateSupplierProfile(
    supplierId: string,
    updateSupplierProfileDto: UpdateSupplierProfileDto
  ): Promise<SupplierProfile> {
    const supplierProfile = await this.supplierProfileRepository.findOne({
      where: { id: supplierId },
    })

    if (!supplierProfile) {
      throw new NotFoundException('Supplier profile not found')
    }

    // Update fields
    Object.assign(supplierProfile, updateSupplierProfileDto)

    const updatedProfile = await this.supplierProfileRepository.save(supplierProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: supplierProfile.userId,
      action: 'supplier_profile_updated',
      resource: 'supplier_profile',
      metadata: {
        supplierId,
        updatedFields: Object.keys(updateSupplierProfileDto),
      },
    })

    return updatedProfile
  }

  async getSupplierProfile(supplierId: string): Promise<SupplierProfile> {
    const supplierProfile = await this.supplierProfileRepository.findOne({
      where: { id: supplierId },
      relations: ['user'],
    })

    if (!supplierProfile) {
      throw new NotFoundException('Supplier profile not found')
    }

    return supplierProfile
  }

  async uploadLogo(supplierId: string, file: Express.Multer.File): Promise<SupplierProfile> {
    const supplierProfile = await this.supplierProfileRepository.findOne({
      where: { id: supplierId },
    })

    if (!supplierProfile) {
      throw new NotFoundException('Supplier profile not found')
    }

    // Upload logo to S3
    const logoUrl = await this.s3Service.uploadFile(file, `suppliers/${supplierId}/logo`)

    // Update supplier profile
    supplierProfile.logoUrl = logoUrl
    const updatedProfile = await this.supplierProfileRepository.save(supplierProfile)

    // Log activity
    await this.activityLogService.logActivity({
      userId: supplierProfile.userId,
      action: 'supplier_logo_uploaded',
      resource: 'supplier_profile',
      metadata: {
        supplierId,
        logoUrl,
      },
    })

    return updatedProfile
  }

  // Product Management
  async createProduct(supplierId: string, createProductDto: CreateProductDto): Promise<Product> {
    // Verify supplier exists
    const supplier = await this.supplierProfileRepository.findOne({
      where: { id: supplierId },
    })

    if (!supplier) {
      throw new NotFoundException('Supplier not found')
    }

    // Create product
    const product = this.productRepository.create({
      supplierId,
      ...createProductDto,
      currency: createProductDto.currency || 'MXN',
      isAvailable: createProductDto.isAvailable ?? true,
    })

    const savedProduct = await this.productRepository.save(product)

    // Log activity
    await this.activityLogService.logActivity({
      userId: supplier.userId,
      action: 'product_created',
      resource: 'product',
      metadata: {
        productId: savedProduct.id,
        supplierId,
      },
    })

    return savedProduct
  }

  async updateProduct(productId: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Update fields
    Object.assign(product, updateProductDto)

    const updatedProduct = await this.productRepository.save(product)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_updated',
      resource: 'product',
      metadata: {
        productId,
        updatedFields: Object.keys(updateProductDto),
      },
    })

    return updatedProduct
  }

  async deleteProduct(productId: string): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier', 'images'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Delete product images from S3
    for (const image of product.images) {
      await this.s3Service.deleteFile(image.imageUrl)
      if (image.thumbnailUrl !== image.imageUrl) {
        await this.s3Service.deleteFile(image.thumbnailUrl)
      }
    }

    // Delete product
    await this.productRepository.remove(product)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_deleted',
      resource: 'product',
      metadata: {
        productId,
      },
    })

    return { message: 'Product deleted successfully' }
  }

  async getProduct(productId: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier', 'images'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    return product
  }

  async getSupplierProducts(supplierId: string): Promise<Product[]> {
    const supplier = await this.supplierProfileRepository.findOne({
      where: { id: supplierId },
    })

    if (!supplier) {
      throw new NotFoundException('Supplier not found')
    }

    const products = await this.productRepository.find({
      where: { supplierId },
      relations: ['images'],
      order: { createdAt: 'DESC' },
    })

    return products
  }

  // Stock Management
  async updateStock(productId: string, updateStockDto: UpdateStockDto): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    const oldStock = product.stockQuantity
    product.stockQuantity = updateStockDto.quantity

    // Auto mark as unavailable if stock is 0
    if (updateStockDto.quantity === 0) {
      product.isAvailable = false
    } else if (oldStock === 0 && updateStockDto.quantity > 0) {
      // Auto mark as available if stock was 0 and now has stock
      product.isAvailable = true
    }

    const updatedProduct = await this.productRepository.save(product)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_stock_updated',
      resource: 'product',
      metadata: {
        productId,
        oldStock,
        newStock: updateStockDto.quantity,
      },
    })

    return updatedProduct
  }

  async getStockStatus(productId: string): Promise<{
    productId: string
    quantity: number
    isAvailable: boolean
    lowStockThreshold: number
    isLowStock: boolean
  }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    return {
      productId: product.id,
      quantity: product.stockQuantity,
      isAvailable: product.isAvailable,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      isLowStock: product.stockQuantity <= LOW_STOCK_THRESHOLD && product.stockQuantity > 0,
    }
  }

  // Product Image Management
  async uploadProductImage(productId: string, file: Express.Multer.File): Promise<ProductImage> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images', 'supplier'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Check image count limit (max 10)
    if (product.images.length >= 10) {
      throw new BadRequestException('Maximum 10 images allowed per product')
    }

    // Upload image to S3
    const imageUrl = await this.s3Service.uploadFile(file, `products/${productId}/images`)

    // Create thumbnail (for now, using same URL - in production, would resize)
    const thumbnailUrl = imageUrl

    // Create product image
    const productImage = this.productImageRepository.create({
      productId,
      imageUrl,
      thumbnailUrl,
      displayOrder: product.images.length,
    })

    const savedImage = await this.productImageRepository.save(productImage)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_image_uploaded',
      resource: 'product_image',
      metadata: {
        productId,
        imageId: savedImage.id,
      },
    })

    return savedImage
  }

  async deleteProductImage(productId: string, imageId: string): Promise<{ message: string }> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images', 'supplier'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    const image = await this.productImageRepository.findOne({
      where: { id: imageId, productId },
    })

    if (!image) {
      throw new NotFoundException('Product image not found')
    }

    // Check minimum image requirement (at least 1 image)
    if (product.images.length <= 1) {
      throw new BadRequestException('Product must have at least 1 image')
    }

    // Delete image from S3
    await this.s3Service.deleteFile(image.imageUrl)
    if (image.thumbnailUrl !== image.imageUrl) {
      await this.s3Service.deleteFile(image.thumbnailUrl)
    }

    // Delete image
    await this.productImageRepository.remove(image)

    // Reorder remaining images
    const remainingImages = await this.productImageRepository.find({
      where: { productId },
      order: { displayOrder: 'ASC' },
    })

    for (let i = 0; i < remainingImages.length; i++) {
      remainingImages[i].displayOrder = i
    }

    await this.productImageRepository.save(remainingImages)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_image_deleted',
      resource: 'product_image',
      metadata: {
        productId,
        imageId,
      },
    })

    return { message: 'Product image deleted successfully' }
  }

  async reorderProductImages(
    productId: string,
    reorderImagesDto: ReorderImagesDto
  ): Promise<ProductImage[]> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['images', 'supplier'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    // Verify all image IDs belong to this product
    const images = await this.productImageRepository.find({
      where: { id: In(reorderImagesDto.imageIds), productId },
    })

    if (images.length !== reorderImagesDto.imageIds.length) {
      throw new BadRequestException('One or more invalid image IDs provided')
    }

    // Update display order
    for (let i = 0; i < reorderImagesDto.imageIds.length; i++) {
      const image = images.find(img => img.id === reorderImagesDto.imageIds[i])
      if (image) {
        image.displayOrder = i
      }
    }

    const updatedImages = await this.productImageRepository.save(images)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_images_reordered',
      resource: 'product_image',
      metadata: {
        productId,
        imageOrder: reorderImagesDto.imageIds,
      },
    })

    return updatedImages.sort((a, b) => a.displayOrder - b.displayOrder)
  }

  // Price Management
  async updatePrice(productId: string, updatePriceDto: UpdatePriceDto): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['supplier'],
    })

    if (!product) {
      throw new NotFoundException('Product not found')
    }

    const oldPrice = product.price
    product.price = updatePriceDto.price

    const updatedProduct = await this.productRepository.save(product)

    // Update prices in active carts
    await this.updateCartPrices(productId, updatePriceDto.price)

    // Log activity
    await this.activityLogService.logActivity({
      userId: product.supplier.userId,
      action: 'product_price_updated',
      resource: 'product',
      metadata: {
        productId,
        oldPrice,
        newPrice: updatePriceDto.price,
      },
    })

    return updatedProduct
  }

  private async updateCartPrices(productId: string, newPrice: number): Promise<void> {
    // Find all cart items with this product
    const cartItems = await this.cartItemRepository.find({
      where: { productId },
      relations: ['cart'],
    })

    for (const cartItem of cartItems) {
      // Update cart item price
      cartItem.price = newPrice
      cartItem.subtotal = newPrice * cartItem.quantity
      await this.cartItemRepository.save(cartItem)

      // Recalculate cart totals
      const cart = await this.cartRepository.findOne({
        where: { id: cartItem.cart.id },
        relations: ['items'],
      })

      if (cart) {
        cart.subtotal = cart.items.reduce((sum, item) => sum + Number(item.subtotal), 0)
        cart.total = cart.subtotal
        await this.cartRepository.save(cart)
      }
    }
  }

  // Supplier Statistics
  async getSupplierStats(supplierId: string): Promise<{
    supplierId: string
    totalProducts: number
    activeProducts: number
    totalOrders: number
    completedOrders: number
    averageRating: number
    totalRevenue: number
    responseRate: number
  }> {
    const supplier = await this.supplierProfileRepository.findOne({
      where: { id: supplierId },
    })

    if (!supplier) {
      throw new NotFoundException('Supplier not found')
    }

    // Get all products
    const products = await this.productRepository.find({
      where: { supplierId },
    })

    const totalProducts = products.length
    const activeProducts = products.filter(p => p.isAvailable).length

    // Get all orders
    const orders = await this.orderRepository.find({
      where: { supplierId },
    })

    const totalOrders = orders.length
    const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED).length

    // Calculate total revenue from completed orders
    const totalRevenue = orders
      .filter(o => o.status === OrderStatus.DELIVERED)
      .reduce((sum, o) => sum + Number(o.total), 0)

    return {
      supplierId,
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      averageRating: Number(supplier.rating),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      responseRate: Number(supplier.responseRate),
    }
  }
}
