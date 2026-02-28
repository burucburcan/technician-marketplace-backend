import { IsUUID, IsInt, Min, Max, IsString } from 'class-validator'

export class CreateSupplierReviewDto {
  @IsUUID()
  orderId: string

  @IsUUID()
  supplierId: string

  @IsInt()
  @Min(1)
  @Max(5)
  productQualityRating: number

  @IsInt()
  @Min(1)
  @Max(5)
  deliverySpeedRating: number

  @IsInt()
  @Min(1)
  @Max(5)
  communicationRating: number

  @IsString()
  comment: string
}
