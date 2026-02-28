import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ProfessionalType } from '../../../common/enums'

export class ListProfessionalsDto {
  @IsOptional()
  @IsEnum(ProfessionalType)
  professionalType?: ProfessionalType

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
