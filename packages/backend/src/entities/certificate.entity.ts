import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { ProfessionalProfile } from './professional-profile.entity'

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'professional_id', type: 'uuid' })
  professionalId: string

  @Column()
  name: string

  @Column()
  issuer: string

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date

  @Column({ name: 'file_url' })
  fileUrl: string

  @Column({ name: 'verified_by_admin', default: false })
  verifiedByAdmin: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  // Relations
  @ManyToOne(() => ProfessionalProfile, profile => profile.certificates)
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile
}
