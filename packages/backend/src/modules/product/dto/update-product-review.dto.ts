import { IsInt, Min, Max, IsString, IsOptional, IsArray } from 'class-validator'

export class UpdateProductReviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number

  @IsOptional()
  @IsString()
  comment?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]
}
