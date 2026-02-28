import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { Booking } from './booking.entity'
import { Order } from './order.entity'
import { PaymentStatus } from '../common/enums'
import { InvoiceType } from '../common/enums/invoice-type.enum'

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ default: 'MXN' })
  currency: string

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus

  @Column({ name: 'payment_method' })
  paymentMethod: string

  @Column({ name: 'stripe_payment_id', nullable: true })
  stripePaymentId: string

  @Column({
    name: 'platform_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  platformFee: number

  @Column({
    name: 'professional_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  professionalAmount: number

  @Column({ name: 'invoice_type', type: 'enum', enum: InvoiceType, nullable: true })
  invoiceType: InvoiceType

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  taxAmount: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // Relations
  @OneToOne(() => Booking, booking => booking.payment)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking

  @OneToOne(() => Order, order => order.payment)
  @JoinColumn({ name: 'order_id' })
  order: Order
}
