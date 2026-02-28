import { IsEnum, IsString, IsOptional } from 'class-validator'
import { VerificationStatus } from '../../../common/enums'

export class VerifyProfessionalDto {
  @IsEnum(VerificationStatus)
  verificationStatus: VerificationStatus

  @IsString()
  @IsOptional()
  notes?: string
}
