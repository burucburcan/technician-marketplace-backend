import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './user.entity'

export enum NotificationType {
  // Booking notifications
  BOOKING_CREATED = 'booking_created',
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_REJECTED = 'booking_rejected',
  BOOKING_CANCELLED = 'booking_cancelled',
  BOOKING_REMINDER = 'booking_reminder',
  BOOKING_STARTED = 'booking_started',
  BOOKING_COMPLETED = 'booking_completed',

  // Messaging notifications
  NEW_MESSAGE = 'new_message',

  // Rating notifications
  NEW_RATING = 'new_rating',

  // Product rating notifications
  NEW_PRODUCT_REVIEW = 'new_product_review',
  NEW_SUPPLIER_REVIEW = 'new_supplier_review',
  SUPPLIER_REPLY = 'supplier_reply',

  // Payment notifications
  PAYMENT_RECEIVED = 'payment_received',
  PAYOUT_PROCESSED = 'payout_processed',

  // Order notifications
  ORDER_CREATED = 'order_created',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PREPARING = 'order_preparing',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',

  // System notifications
  ACCOUNT_VERIFIED = 'account_verified',
  PROFILE_APPROVED = 'profile_approved',
  PROFILE_REJECTED = 'profile_rejected',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  @Index()
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType

  @Column({ type: 'varchar', length: 255 })
  title: string

  @Column({ type: 'text' })
  message: string

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>

  @Column({ type: 'boolean', default: false })
  isRead: boolean

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    array: true,
    default: [NotificationChannel.IN_APP],
  })
  channels: NotificationChannel[]

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date
}
