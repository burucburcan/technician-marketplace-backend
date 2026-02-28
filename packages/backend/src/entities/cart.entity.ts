import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { CartItem } from './cart-item.entity'

@Entity('carts')
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number

  @Column({ default: 'MXN' })
  currency: string

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @OneToOne(() => User, user => user.cart)
  @JoinColumn({ name: 'user_id' })
  user: User

  @OneToMany(() => CartItem, item => item.cart)
  items: CartItem[]
}
