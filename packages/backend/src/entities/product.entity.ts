import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { SupplierProfile } from './supplier-profile.entity'
import { ProductImage } from './product-image.entity'
import { OrderItem } from './order-item.entity'
import { CartItem } from './cart-item.entity'
import { ProductReview } from './product-review.entity'

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string

  @Column()
  name: string

  @Column({ type: 'text' })
  description: string

  @Column()
  category: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number

  @Column({ default: 'MXN' })
  currency: string

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean

  @Column({ type: 'jsonb', nullable: true })
  specifications: Array<{
    key: string
    value: string
    unit?: string
  }>

  @Column({ nullable: true })
  brand: string

  @Column({ nullable: true })
  model: string

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number

  @Column({ name: 'total_reviews', type: 'int', default: 0 })
  totalReviews: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => SupplierProfile, supplier => supplier.products)
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile

  @OneToMany(() => ProductImage, image => image.product)
  images: ProductImage[]

  @OneToMany(() => OrderItem, item => item.product)
  orderItems: OrderItem[]

  @OneToMany(() => CartItem, item => item.product)
  cartItems: CartItem[]

  @OneToMany(() => ProductReview, review => review.product)
  reviews: ProductReview[]
}
