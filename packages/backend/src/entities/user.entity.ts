import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm'
import { UserRole } from '../common/enums'
import { UserProfile } from './user-profile.entity'
import { ProfessionalProfile } from './professional-profile.entity'
import { SupplierProfile } from './supplier-profile.entity'
import { Booking } from './booking.entity'
import { Order } from './order.entity'
import { Cart } from './cart.entity'
import { ServiceRating } from './service-rating.entity'
import { ProductReview } from './product-review.entity'
import { SupplierReview } from './supplier-review.entity'
import { Encrypted } from '../common/decorators/encrypted.decorator'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column({ name: 'password_hash' })
  passwordHash: string

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole

  @Column({ name: 'is_email_verified', default: false })
  isEmailVerified: boolean

  @Column({ name: 'two_factor_enabled', default: false })
  twoFactorEnabled: boolean

  @Encrypted()
  @Column({ name: 'two_factor_secret', nullable: true })
  twoFactorSecret: string

  @Column({ name: 'is_suspended', default: false })
  isSuspended: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  // Relations
  @OneToOne(() => UserProfile, profile => profile.user)
  profile: UserProfile

  @OneToOne(() => ProfessionalProfile, profile => profile.user)
  professionalProfile: ProfessionalProfile

  @OneToOne(() => SupplierProfile, profile => profile.user)
  supplierProfile: SupplierProfile

  @OneToMany(() => Booking, booking => booking.user)
  bookings: Booking[]

  @OneToMany(() => Order, order => order.user)
  orders: Order[]

  @OneToOne(() => Cart, cart => cart.user)
  cart: Cart

  @OneToMany(() => ServiceRating, rating => rating.user)
  serviceRatings: ServiceRating[]

  @OneToMany(() => ProductReview, review => review.user)
  productReviews: ProductReview[]

  @OneToMany(() => SupplierReview, review => review.user)
  supplierReviews: SupplierReview[]
}
