import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { SupplierProfile } from './supplier-profile.entity'

@Entity('supplier_reviews')
export class SupplierReview {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string

  @Column({ name: 'product_quality_rating', type: 'int' })
  productQualityRating: number

  @Column({ name: 'delivery_speed_rating', type: 'int' })
  deliverySpeedRating: number

  @Column({ name: 'communication_rating', type: 'int' })
  communicationRating: number

  @Column({ name: 'overall_rating', type: 'int' })
  overallRating: number

  @Column({ type: 'text' })
  comment: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // Relations
  @ManyToOne(() => User, user => user.supplierReviews)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => SupplierProfile)
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile
}
