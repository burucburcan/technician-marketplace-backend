import {
  IsUUID,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsUrl,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CategoryRatingDto {
  @IsString()
  category: string

  @IsInt()
  @Min(1)
  @Max(5)
  score: number
}

export class CreateRatingDto {
  @IsUUID()
  bookingId: string

  @IsInt()
  @Min(1)
  @Max(5)
  score: number

  @IsString()
  comment: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryRatingDto)
  categoryRatings: CategoryRatingDto[]

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photoUrls?: string[]
}
