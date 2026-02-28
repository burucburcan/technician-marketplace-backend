import { IsEnum, IsOptional } from 'class-validator'
import { ProfessionalType } from '../../../common/enums'

export class ProfessionalFilterDto {
  @IsEnum(ProfessionalType)
  @IsOptional()
  professionalType?: ProfessionalType
}
