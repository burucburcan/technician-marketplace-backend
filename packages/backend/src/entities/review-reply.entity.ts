import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ProductReview } from './product-review.entity'
import { SupplierProfile } from './supplier-profile.entity'

@Entity('review_replies')
export class ReviewReply {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId: string

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string

  @Column({ type: 'text' })
  reply: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // Relations
  @ManyToOne(() => ProductReview)
  @JoinColumn({ name: 'review_id' })
  review: ProductReview

  @ManyToOne(() => SupplierProfile)
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile
}
