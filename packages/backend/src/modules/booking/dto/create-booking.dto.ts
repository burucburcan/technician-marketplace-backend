import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  IsUrl,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ProfessionalType } from '../../../common/enums'

class CoordinatesDto {
  @IsNumber()
  latitude: number

  @IsNumber()
  longitude: number
}

class ServiceAddressDto {
  @IsString()
  @IsNotEmpty()
  address: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsString()
  @IsNotEmpty()
  state: string

  @IsString()
  @IsNotEmpty()
  country: string

  @IsString()
  @IsNotEmpty()
  postalCode: string

  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto
}

class PriceRangeDto {
  @IsNumber()
  @Min(0)
  min: number

  @IsNumber()
  @Min(0)
  max: number

  @IsString()
  currency: string
}

class ProjectDetailsDto {
  @IsString()
  @IsNotEmpty()
  projectType: string

  @IsString()
  @IsNotEmpty()
  estimatedDuration: string

  @ValidateNested()
  @Type(() => PriceRangeDto)
  priceRange: PriceRangeDto

  @IsString()
  @IsOptional()
  specialRequirements?: string

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  materials?: string[]
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  professionalId: string

  @IsEnum(ProfessionalType)
  professionalType: ProfessionalType

  @IsString()
  @IsNotEmpty()
  serviceCategory: string

  @IsDate()
  @Type(() => Date)
  scheduledDate: Date

  @IsNumber()
  @Min(1)
  estimatedDuration: number

  @ValidateNested()
  @Type(() => ServiceAddressDto)
  serviceAddress: ServiceAddressDto

  @IsString()
  @IsNotEmpty()
  description: string

  @IsNumber()
  @Min(0)
  estimatedPrice: number

  // Artist-specific fields
  @ValidateNested()
  @Type(() => ProjectDetailsDto)
  @IsOptional()
  projectDetails?: ProjectDetailsDto

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  referenceImages?: string[]
}
