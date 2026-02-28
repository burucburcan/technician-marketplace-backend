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
import { ApprovalStatus } from '../common/enums'

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column({ name: 'image_url' })
  imageUrl: string

  @Column({ name: 'thumbnail_url' })
  thumbnailUrl: string

  @Column()
  title: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column()
  category: string

  @Column({ name: 'completion_date', type: 'date', nullable: true })
  completionDate: Date

  @Column({ nullable: true })
  dimensions: string

  @Column({ type: 'text', array: true, nullable: true })
  materials: string[]

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy?: string

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt?: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => ProfessionalProfile, profile => profile.portfolio)
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile
}
