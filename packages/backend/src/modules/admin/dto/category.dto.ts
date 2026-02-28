import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class NameTranslationsDto {
  @IsString()
  es: string

  @IsString()
  en: string
}

export class ListCategoriesDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isTechnical?: boolean

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20
}

export class CreateCategoryDto {
  @IsString()
  name: string

  @IsObject()
  @ValidateNested()
  @Type(() => NameTranslationsDto)
  nameTranslations: NameTranslationsDto

  @IsOptional()
  @IsString()
  description?: string

  @IsBoolean()
  isTechnical: boolean
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NameTranslationsDto)
  nameTranslations?: NameTranslationsDto

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsBoolean()
  isTechnical?: boolean
}
