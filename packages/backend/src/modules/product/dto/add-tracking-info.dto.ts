import { IsString, IsNotEmpty } from 'class-validator'

export class AddTrackingInfoDto {
  @IsString()
  @IsNotEmpty()
  trackingNumber: string

  @IsString()
  @IsNotEmpty()
  carrier: string
}
