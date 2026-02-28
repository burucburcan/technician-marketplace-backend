import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { User } from './user.entity'
import { VerificationStatus } from '../common/enums'
import { Product } from './product.entity'
import { Order } from './order.entity'

@Entity('supplier_profiles')
export class SupplierProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'company_name' })
  companyName: string

  @Column({ name: 'tax_id' })
  taxId: string

  @Column({ name: 'business_address', type: 'jsonb' })
  businessAddress: {
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

  @Column({ name: 'contact_phone' })
  contactPhone: string

  @Column({ name: 'contact_email' })
  contactEmail: string

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  verificationStatus: VerificationStatus

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number

  @Column({ name: 'total_orders', type: 'int', default: 0 })
  totalOrders: number

  @Column({
    name: 'response_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  responseRate: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @OneToOne(() => User, user => user.supplierProfile)
  @JoinColumn({ name: 'user_id' })
  user: User

  @OneToMany(() => Product, product => product.supplier)
  products: Product[]

  @OneToMany(() => Order, order => order.supplier)
  orders: Order[]
}
