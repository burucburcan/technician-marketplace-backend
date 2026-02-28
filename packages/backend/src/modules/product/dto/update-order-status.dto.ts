import { IsEnum, IsOptional, IsString } from 'class-validator'
import { OrderStatus } from '../../../common/enums'

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus

  @IsOptional()
  @IsString()
  trackingNumber?: string

  @IsOptional()
  @IsString()
  carrier?: string
}
