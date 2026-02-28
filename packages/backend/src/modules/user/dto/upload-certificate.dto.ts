import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator'

export class UploadCertificateDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  issuer: string

  @IsDateString()
  @IsNotEmpty()
  issueDate: string

  @IsDateString()
  @IsOptional()
  expiryDate?: string
}
