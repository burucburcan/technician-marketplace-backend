import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Booking } from './booking.entity'
import { Order } from './order.entity'
import { Encrypted } from '../common/decorators/encrypted.decorator'

export enum InvoiceStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId: string

  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId: string

  @Column({ name: 'invoice_number', unique: true })
  invoiceNumber: string

  @Column({ name: 'issue_date', type: 'timestamp' })
  issueDate: Date

  @Column({ name: 'due_date', type: 'timestamp' })
  dueDate: Date

  @Column({ name: 'customer_name' })
  customerName: string

  @Encrypted()
  @Column({ name: 'customer_tax_id', nullable: true })
  customerTaxId: string

  @Column({ name: 'customer_address' })
  customerAddress: string

  @Column({ name: 'customer_city' })
  customerCity: string

  @Column({ name: 'customer_country' })
  customerCountry: string

  @Column({ name: 'customer_postal_code' })
  customerPostalCode: string

  @Column({ name: 'customer_email' })
  customerEmail: string

  @Column({ type: 'jsonb' })
  items: InvoiceItem[]

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2 })
  taxRate: number

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2 })
  taxAmount: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number

  @Column({ default: 'MXN' })
  currency: string

  @Column({ name: 'pdf_url', nullable: true })
  pdfUrl: string

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}
