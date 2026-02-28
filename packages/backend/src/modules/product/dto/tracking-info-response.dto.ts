export class TrackingInfoResponseDto {
  orderId: string
  orderNumber: string
  trackingNumber: string | null
  carrier: string | null
  status: string
  shippedAt: Date | null
  deliveredAt: Date | null
  estimatedDelivery: Date | null
}
