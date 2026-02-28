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
import { User } from './user.entity'
import { IssueType, DisputeStatus } from '../common/enums'

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId: string

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId: string

  @Column({ name: 'reported_user_id', type: 'uuid' })
  reportedUserId: string

  @Column({
    name: 'issue_type',
    type: 'enum',
    enum: IssueType,
  })
  issueType: IssueType

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'text', array: true, nullable: true })
  photos: string[]

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  status: DisputeStatus

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string

  @Column({ name: 'admin_action', type: 'text', nullable: true })
  adminAction: string

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reporter_id' })
  reporter: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser: User

  @ManyToOne(() => User)
  @JoinColumn({ name: 'resolved_by' })
  resolver: User
}
