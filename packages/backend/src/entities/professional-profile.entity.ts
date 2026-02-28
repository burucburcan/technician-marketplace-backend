import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm'
import { User } from './user.entity'
import { ProfessionalType, VerificationStatus } from '../common/enums'
import { Certificate } from './certificate.entity'
import { ServiceCategory } from './service-category.entity'
import { PortfolioItem } from './portfolio-item.entity'
import { Booking } from './booking.entity'

@Entity('professional_profiles')
export class ProfessionalProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'provider_id', type: 'uuid', nullable: true })
  providerId: string

  @Column({
    name: 'professional_type',
    type: 'enum',
    enum: ProfessionalType,
  })
  professionalType: ProfessionalType

  @Column({ name: 'business_name', nullable: true })
  businessName: string

  @Column({ name: 'experience_years', type: 'int' })
  experienceYears: number

  @Column({ name: 'hourly_rate', type: 'decimal', precision: 10, scale: 2 })
  hourlyRate: number

  @Column({ name: 'service_radius', type: 'int' })
  serviceRadius: number

  @Column({ name: 'working_hours', type: 'jsonb' })
  workingHours: {
    monday: Array<{ start: string; end: string }>
    tuesday: Array<{ start: string; end: string }>
    wednesday: Array<{ start: string; end: string }>
    thursday: Array<{ start: string; end: string }>
    friday: Array<{ start: string; end: string }>
    saturday: Array<{ start: string; end: string }>
    sunday: Array<{ start: string; end: string }>
  }

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean

  @Column({ name: 'current_location', type: 'jsonb', nullable: true })
  currentLocation: {
    latitude: number
    longitude: number
  }

  @Column({ name: 'service_address', type: 'jsonb', nullable: true })
  serviceAddress: {
    address: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    latitude: number
    longitude: number
  }

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number

  @Column({ name: 'total_jobs', type: 'int', default: 0 })
  totalJobs: number

  @Column({
    name: 'completion_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  completionRate: number

  // Artist-specific fields
  @Column({ name: 'art_style', type: 'text', array: true, nullable: true })
  artStyle: string[]

  @Column({ type: 'text', array: true, nullable: true })
  materials: string[]

  @Column({ type: 'text', array: true, nullable: true })
  techniques: string[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @OneToOne(() => User, user => user.professionalProfile)
  @JoinColumn({ name: 'user_id' })
  user: User

  @OneToMany(() => Certificate, certificate => certificate.professional)
  certificates: Certificate[]

  @ManyToMany(() => ServiceCategory)
  @JoinTable({
    name: 'professional_service_categories',
    joinColumn: { name: 'professional_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  specializations: ServiceCategory[]

  @OneToMany(() => PortfolioItem, item => item.professional)
  portfolio: PortfolioItem[]

  @OneToMany(() => Booking, booking => booking.professional)
  bookings: Booking[]
}
