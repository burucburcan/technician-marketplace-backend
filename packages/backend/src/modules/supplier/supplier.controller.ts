import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { SupplierService } from './supplier.service'
import {
  CreateSupplierProfileDto,
  UpdateSupplierProfileDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateStockDto,
  UpdatePriceDto,
  ReorderImagesDto,
} from './dto'
import { AuthenticatedRequest } from '../../common/types/request.types'
import { UserRole } from '../../common/enums'
import { ForbiddenException } from '@nestjs/common'

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  private verifySupplierAccess(user: AuthenticatedRequest['user'], supplierId: string) {
    if (user.role !== UserRole.SUPPLIER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only suppliers can access this resource')
    }

    // Suppliers can only access their own resources (admins can access all)
    if (user.role === UserRole.SUPPLIER && user.supplierId !== supplierId) {
      throw new ForbiddenException('You can only manage your own supplier profile')
    }
  }

  // Supplier Profile Management
  @Post('profile')
  async createSupplierProfile(
    @Body() createSupplierProfileDto: CreateSupplierProfileDto,
    @Request() req: AuthenticatedRequest
  ) {
    if (req.user.role !== UserRole.SUPPLIER) {
      throw new ForbiddenException('Only suppliers can create a supplier profile')
    }

    return this.supplierService.createSupplierProfile(req.user.userId, createSupplierProfileDto)
  }

  @Put(':id/profile')
  async updateSupplierProfile(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @Body() updateSupplierProfileDto: UpdateSupplierProfileDto,
    @Request() req: AuthenticatedRequest
  ) {
    this.verifySupplierAccess(req.user, supplierId)
    return this.supplierService.updateSupplierProfile(supplierId, updateSupplierProfileDto)
  }

  @Get(':id/profile')
  async getSupplierProfile(@Param('id', ParseUUIDPipe) supplierId: string) {
    return this.supplierService.getSupplierProfile(supplierId)
  }

  @Post(':id/profile/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest
  ) {
    this.verifySupplierAccess(req.user, supplierId)

    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    return this.supplierService.uploadLogo(supplierId, file)
  }

  // Product Management
  @Post(':id/products')
  async createProduct(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @Body() createProductDto: CreateProductDto,
    @Request() req: AuthenticatedRequest
  ) {
    this.verifySupplierAccess(req.user, supplierId)
    return this.supplierService.createProduct(supplierId, createProductDto)
  }

  @Put('products/:productId')
  async updateProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    return this.supplierService.updateProduct(productId, updateProductDto)
  }

  @Delete('products/:productId')
  async deleteProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    return this.supplierService.deleteProduct(productId)
  }

  @Get('products/:productId')
  async getProduct(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.supplierService.getProduct(productId)
  }

  @Get(':id/products')
  async getSupplierProducts(@Param('id', ParseUUIDPipe) supplierId: string) {
    return this.supplierService.getSupplierProducts(supplierId)
  }

  // Stock Management
  @Put('products/:productId/stock')
  async updateStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateStockDto: UpdateStockDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    return this.supplierService.updateStock(productId, updateStockDto)
  }

  @Get('products/:productId/stock')
  async getStockStatus(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.supplierService.getStockStatus(productId)
  }

  // Product Image Management
  @Post('products/:productId/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    return this.supplierService.uploadProductImage(productId, file)
  }

  @Delete('products/:productId/images/:imageId')
  async deleteProductImage(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    return this.supplierService.deleteProductImage(productId, imageId)
  }

  @Put('products/:productId/images/reorder')
  async reorderProductImages(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() reorderImagesDto: ReorderImagesDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    return this.supplierService.reorderProductImages(productId, reorderImagesDto)
  }

  // Price Management
  @Put('products/:productId/price')
  async updatePrice(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updatePriceDto: UpdatePriceDto,
    @Request() req: AuthenticatedRequest
  ) {
    // Verify product belongs to supplier
    const product = await this.supplierService.getProduct(productId)
    this.verifySupplierAccess(req.user, product.supplierId)

    return this.supplierService.updatePrice(productId, updatePriceDto)
  }

  // Supplier Statistics
  @Get(':id/stats')
  async getSupplierStats(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @Request() req: AuthenticatedRequest
  ) {
    this.verifySupplierAccess(req.user, supplierId)
    return this.supplierService.getSupplierStats(supplierId)
  }

  // Supplier Reviews
  @Get(':id/reviews')
  async getSupplierReviews(
    @Param('id', ParseUUIDPipe) _supplierId: string,
    @Request() _req: AuthenticatedRequest
  ) {
    // Import ProductRatingService to access reviews
    // This will be injected in the module
    throw new Error('Not implemented - use ProductRatingService')
  }

  @Get(':id/reviews/stats')
  async getSupplierRatingStats(@Param('id', ParseUUIDPipe) _supplierId: string) {
    // Import ProductRatingService to access stats
    throw new Error('Not implemented - use ProductRatingService')
  }
}
