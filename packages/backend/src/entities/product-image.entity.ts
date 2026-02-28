import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Product } from './product.entity'

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string

  @Column({ name: 'image_url' })
  imageUrl: string

  @Column({ name: 'thumbnail_url' })
  thumbnailUrl: string

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // Relations
  @ManyToOne(() => Product, product => product.images)
  @JoinColumn({ name: 'product_id' })
  product: Product
}
