import { IsString, IsNumber, IsOptional, IsArray, IsObject, IsBoolean, Min } from 'class-validator'

export class UpdateProfessionalDto {
  @IsString()
  @IsOptional()
  businessName?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializationIds?: string[]

  @IsNumber()
  @Min(0)
  @IsOptional()
  experienceYears?: number

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number

  @IsNumber()
  @Min(1)
  @IsOptional()
  serviceRadius?: number

  @IsObject()
  @IsOptional()
  workingHours?: {
    monday: Array<{ start: string; end: string }>
    tuesday: Array<{ start: string; end: string }>
    wednesday: Array<{ start: string; end: string }>
    thursday: Array<{ start: string; end: string }>
    friday: Array<{ start: string; end: string }>
    saturday: Array<{ start: string; end: string }>
    sunday: Array<{ start: string; end: string }>
  }

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean

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
