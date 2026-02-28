import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm'
import { ProfessionalProfile } from './professional-profile.entity'

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string

  @Column({ type: 'jsonb' })
  nameTranslations: {
    es: string
    en: string
  }

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ name: 'is_technical', default: true })
  isTechnical: boolean

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @ManyToMany(() => ProfessionalProfile, professional => professional.specializations)
  professionals: ProfessionalProfile[]
}
