import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { Product } from './product.entity'

@Entity('product_reviews')
export class ProductReview {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string

  @Column({ type: 'int' })
  rating: number

  @Column({ type: 'text' })
  comment: string

  @Column({ type: 'text', array: true, nullable: true })
  images: string[]

  @Column({ name: 'is_verified_purchase', default: false })
  isVerifiedPurchase: boolean

  @Column({ name: 'helpful_count', type: 'int', default: 0 })
  helpfulCount: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => User, user => user.productReviews)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Product, product => product.reviews)
  @JoinColumn({ name: 'product_id' })
  product: Product
}
