import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SupplierController } from './supplier.controller'
import { SupplierService } from './supplier.service'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { User } from '../../entities/user.entity'
import { Order } from '../../entities/order.entity'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { ActivityLogModule } from '../activity-log/activity-log.module'
import { S3Module } from '../s3/s3.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([SupplierProfile, Product, ProductImage, User, Order, Cart, CartItem]),
    ActivityLogModule,
    S3Module,
  ],
  controllers: [SupplierController],
  providers: [SupplierService],
  exports: [SupplierService],
})
export class SupplierModule {}
