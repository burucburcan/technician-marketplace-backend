import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsObject,
  Min,
  Max,
} from 'class-validator'
import { ProfessionalType } from '../../../common/enums'

export class CreateProfessionalDto {
  @IsEnum(ProfessionalType)
  professionalType: ProfessionalType

  @IsString()
  @IsOptional()
  businessName?: string

  @IsArray()
  @IsString({ each: true })
  specializationIds: string[]

  @IsNumber()
  @Min(0)
  experienceYears: number

  @IsNumber()
  @Min(0)
  hourlyRate: number

  @IsNumber()
  @Min(1)
  serviceRadius: number

  @IsObject()
  workingHours: {
    monday: Array<{ start: string; end: string }>
    tuesday: Array<{ start: string; end: string }>
    wednesday: Array<{ start: string; end: string }>
    thursday: Array<{ start: string; end: string }>
    friday: Array<{ start: string; end: string }>
    saturday: Array<{ start: string; end: string }>
    sunday: Array<{ start: string; end: string }>
  }

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  artStyle?: string[]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  materials?: string[]

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  techniques?: string[]

  @IsObject()
  @IsOptional()
  serviceAddress?: {
    address: string
    city?: string
    state?: string
    country?: string
    postalCode?: string
    latitude: number
    longitude: number
  }
}
