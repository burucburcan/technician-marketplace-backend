import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator'

export class RefundPaymentDto {
  @IsNotEmpty()
  @IsString()
  paymentId: string

  @IsOptional()
  @IsNumber()
  amount?: number

  @IsNotEmpty()
  @IsString()
  reason: string
}
