import { IsUUID, IsInt, Min, Max, IsString, IsOptional, IsArray } from 'class-validator'

export class CreateProductReviewDto {
  @IsUUID()
  orderId: string

  @IsUUID()
  productId: string

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @IsString()
  comment: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]
}
