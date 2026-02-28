import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { SupplierProfile } from './supplier-profile.entity'
import { OrderItem } from './order-item.entity'
import { Payment } from './payment.entity'
import { OrderStatus, PaymentStatus } from '../common/enums'

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_number', unique: true })
  orderNumber: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'supplier_id', type: 'uuid' })
  supplierId: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number

  @Column({
    name: 'shipping_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingCost: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number

  @Column({ default: 'MXN' })
  currency: string

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress: {
    address: string
    city: string
    state: string
    country: string
    postalCode: string
    coordinates: {
      latitude: number
      longitude: number
    }
  }

  @Column({ name: 'billing_address', type: 'jsonb' })
  billingAddress: {
    address: string
    city: string
    state: string
    country: string
    postalCode: string
  }

  @Column({ name: 'payment_method' })
  paymentMethod: string

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus

  @Column({ name: 'tracking_number', nullable: true })
  trackingNumber: string

  @Column({ nullable: true })
  carrier: string

  @Column({ name: 'estimated_delivery', type: 'timestamp', nullable: true })
  estimatedDelivery: Date

  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true })
  confirmedAt: Date

  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true })
  shippedAt: Date

  @Column({ name: 'delivered_at', type: 'timestamp', nullable: true })
  deliveredAt: Date

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => SupplierProfile, supplier => supplier.orders)
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[]

  @OneToOne(() => Payment, payment => payment.order)
  payment: Payment
}
