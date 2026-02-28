import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class ProductSearchQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minPrice?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  supplierId?: string

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inStock?: boolean = true

  @IsOptional()
  @IsEnum(['price', 'rating', 'popularity', 'newest'])
  sortBy?: 'price' | 'rating' | 'popularity' | 'newest' = 'rating'

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  pageSize?: number = 20
}
