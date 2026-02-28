import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ProfessionalProfile } from './professional-profile.entity'
import { BookingStatus, PaymentStatus, ProfessionalType } from '../common/enums'
import { Payment } from './payment.entity'

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column({
    name: 'professional_type',
    type: 'enum',
    enum: ProfessionalType,
  })
  professionalType: ProfessionalType

  @Column({ name: 'service_category' })
  serviceCategory: string

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus

  @Column({ name: 'scheduled_date', type: 'timestamp' })
  scheduledDate: Date

  @Column({ name: 'estimated_duration', type: 'int' })
  estimatedDuration: number

  @Column({ name: 'service_address', type: 'jsonb' })
  serviceAddress: {
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

  @Column({ type: 'text' })
  description: string

  @Column({
    name: 'estimated_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  estimatedPrice: number

  @Column({
    name: 'actual_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  actualPrice: number

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus

  @Column({ name: 'project_details', type: 'jsonb', nullable: true })
  projectDetails: {
    projectType: string
    estimatedDuration: string
    priceRange: {
      min: number
      max: number
      currency: string
    }
    specialRequirements?: string
    materials?: string[]
  }

  @Column({ name: 'progress_photos', type: 'jsonb', nullable: true })
  progressPhotos: Array<{
    id: string
    url: string
    caption?: string
    uploadedAt: Date
    uploadedBy: string
  }>

  @Column({ name: 'reference_images', type: 'text', array: true, nullable: true })
  referenceImages: string[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt: Date

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string

  // Relations
  @ManyToOne(() => User, user => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => ProfessionalProfile, profile => profile.bookings)
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile

  @OneToOne(() => Payment, payment => payment.booking)
  payment: Payment
}
