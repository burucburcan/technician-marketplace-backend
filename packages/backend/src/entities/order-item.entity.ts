import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm'
import { Order } from './order.entity'
import { Product } from './product.entity'

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string

  @Column({ name: 'product_name' })
  productName: string

  @Column({ name: 'product_image' })
  productImage: string

  @Column({ type: 'int' })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number

  // Relations
  @ManyToOne(() => Order, order => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order

  @ManyToOne(() => Product, product => product.orderItems)
  @JoinColumn({ name: 'product_id' })
  product: Product
}
