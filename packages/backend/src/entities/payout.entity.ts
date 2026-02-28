import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ProfessionalProfile } from './professional-profile.entity'

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number

  @Column({ default: 'MXN' })
  currency: string

  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.PENDING,
  })
  status: PayoutStatus

  @Column({ name: 'stripe_transfer_id', nullable: true })
  stripeTransferId: string

  @Column({ name: 'failure_reason', nullable: true })
  failureReason: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date

  // Relations
  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile
}
