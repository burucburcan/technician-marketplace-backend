import { PartialType } from '@nestjs/mapped-types'
import { CreateProfessionalProfileDto } from './create-professional-profile.dto'
import { IsBoolean, IsOptional, IsObject, IsArray, IsUUID } from 'class-validator'

export class UpdateProfessionalProfileDto extends PartialType(CreateProfessionalProfileDto) {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specializationIds?: string[]

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean

  @IsOptional()
  @IsObject()
  currentLocation?: {
    latitude: number
    longitude: number
  }
}
