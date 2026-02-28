import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Cart } from './cart.entity'
import { Product } from './product.entity'

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId: string

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string

  @Column({ type: 'int' })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number

  // Relations
  @ManyToOne(() => Cart, cart => cart.items)
  @JoinColumn({ name: 'cart_id' })
  cart: Cart

  @ManyToOne(() => Product, product => product.cartItems)
  @JoinColumn({ name: 'product_id' })
  product: Product
}
