import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsBoolean,
} from 'class-validator'
import { Type } from 'class-transformer'

class ProductSpecificationDto {
  @IsString()
  @IsNotEmpty()
  key: string

  @IsString()
  @IsNotEmpty()
  value: string

  @IsString()
  @IsOptional()
  unit?: string
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  description: string

  @IsString()
  @IsNotEmpty()
  category: string

  @IsNumber()
  @Min(0)
  price: number

  @IsString()
  @IsOptional()
  currency?: string

  @IsNumber()
  @Min(0)
  stockQuantity: number

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecificationDto)
  @IsOptional()
  specifications?: ProductSpecificationDto[]

  @IsString()
  @IsOptional()
  brand?: string

  @IsString()
  @IsOptional()
  model?: string
}
