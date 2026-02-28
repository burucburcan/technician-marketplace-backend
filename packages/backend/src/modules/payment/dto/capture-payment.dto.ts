import { IsNotEmpty, IsString } from 'class-validator'

export class CapturePaymentDto {
  @IsNotEmpty()
  @IsString()
  paymentIntentId: string
}
