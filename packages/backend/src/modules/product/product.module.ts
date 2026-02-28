import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import {
  ProductController,
  UserOrderController,
  SupplierOrderController,
  ReviewController,
} from './product.controller'
import { SupplierReviewController } from './supplier-review.controller'
import { ProductService } from './product.service'
import { ProductRatingService } from './product-rating.service'
import { CartController } from './cart.controller'
import { CartService } from './cart.service'
import { Product } from '../../entities/product.entity'
import { ProductImage } from '../../entities/product-image.entity'
import { ProductReview } from '../../entities/product-review.entity'
import { SupplierReview } from '../../entities/supplier-review.entity'
import { ReviewReply } from '../../entities/review-reply.entity'
import { Cart } from '../../entities/cart.entity'
import { CartItem } from '../../entities/cart-item.entity'
import { Order } from '../../entities/order.entity'
import { OrderItem } from '../../entities/order-item.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { User } from '../../entities/user.entity'
import { NotificationModule } from '../notification/notification.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductReview,
      SupplierReview,
      ReviewReply,
      Cart,
      CartItem,
      Order,
      OrderItem,
      SupplierProfile,
      User,
    ]),
    NotificationModule,
  ],
  controllers: [
    ProductController,
    CartController,
    UserOrderController,
    SupplierOrderController,
    ReviewController,
    SupplierReviewController,
  ],
  providers: [ProductService, ProductRatingService, CartService],
  exports: [ProductService, ProductRatingService, CartService],
})
export class ProductModule {}
