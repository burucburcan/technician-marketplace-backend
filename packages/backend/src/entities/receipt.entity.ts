import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Booking } from './booking.entity'
import { Order } from './order.entity'

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string

  @Column({ name: 'receipt_number', unique: true })
  receiptNumber: string

  @Column({ name: 'issue_date', type: 'timestamp' })
  issueDate: Date

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ default: 'MXN' })
  currency: string

  @Column({ type: 'text' })
  description: string

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // Relations
  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order
}
