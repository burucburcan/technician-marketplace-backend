import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', nullable: true })
  userId: string

  @Column()
  action: string

  @Column()
  resource: string

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date
}
