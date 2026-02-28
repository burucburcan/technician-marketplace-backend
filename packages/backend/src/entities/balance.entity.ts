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

@Entity('balances')
export class Balance {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'professional_id', type: 'uuid', unique: true })
  professionalId: string

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  available: number

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  pending: number

  @Column({ default: 'MXN' })
  currency: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToOne(() => ProfessionalProfile)
  @JoinColumn({ name: 'professional_id' })
  professional: ProfessionalProfile
}
