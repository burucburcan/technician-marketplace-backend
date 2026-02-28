import { IsOptional, IsString, IsNumber, IsEnum, IsArray } from 'class-validator'
import { Type } from 'class-transformer'
import { ProfessionalType } from '../../../common/enums'

export class RecommendedProfessionalsDto {
  @IsNumber()
  @Type(() => Number)
  latitude: number

  @IsNumber()
  @Type(() => Number)
  longitude: number

  @IsString()
  category: string

  @IsOptional()
  @IsEnum(ProfessionalType)
  professionalType?: ProfessionalType

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maxPrice?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStyles?: string[]

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10
}
