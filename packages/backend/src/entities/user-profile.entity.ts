import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'first_name' })
  firstName: string

  @Column({ name: 'last_name' })
  lastName: string

  @Column()
  phone: string

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string

  @Column({ default: 'es' })
  language: string

  @Column({ type: 'jsonb' })
  location: {
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

  @Column({ type: 'jsonb', default: {} })
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    pushNotifications: boolean
    currency: string
    notificationTypes?: Record<string, boolean>
  }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @OneToOne(() => User, user => user.profile)
  @JoinColumn({ name: 'user_id' })
  user: User
}
