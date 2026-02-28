import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { ProfessionalProfile } from './professional-profile.entity'

@Entity('service_ratings')
export class ServiceRating {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column({ type: 'int' })
  score: number

  @Column({ type: 'text' })
  comment: string

  @Column({ name: 'category_ratings', type: 'jsonb' })
  categoryRatings: Array<{
    category: string
    score: number
  }>

  @Column({ name: 'photo_urls', type: 'text', array: true, nullable: true })
  photoUrls: string[]

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean

  @Column({ name: 'moderation_status', default: 'pending' })
  moderationStatus: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => User, user => user.serviceRatings)
  @JoinColumn({ name: 'user_id' })
  user?: User

  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional?: ProfessionalProfile
}
