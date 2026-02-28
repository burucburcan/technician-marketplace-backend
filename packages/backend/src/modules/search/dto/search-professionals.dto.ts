import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsBoolean,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ProfessionalType } from '../../../common/enums'

export class SearchProfessionalsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsEnum(ProfessionalType)
  professionalType?: ProfessionalType

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  radius?: number = 50 // km

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(5)
  minRating?: number

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxPrice?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artStyle?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[]

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  verifiedOnly?: boolean = false

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  availableOnly?: boolean = true

  @IsOptional()
  @IsEnum(['distance', 'rating', 'price', 'experience', 'portfolio'])
  sortBy?: 'distance' | 'rating' | 'price' | 'experience' | 'portfolio' = 'rating'

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
