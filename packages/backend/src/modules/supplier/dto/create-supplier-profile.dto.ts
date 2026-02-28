import { IsString, IsEmail, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class CoordinatesDto {
  @IsNotEmpty()
  latitude: number

  @IsNotEmpty()
  longitude: number
}

class LocationDto {
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

export class CreateSupplierProfileDto {
  @IsString()
  @IsNotEmpty()
  companyName: string

  @IsString()
  @IsNotEmpty()
  taxId: string

  @ValidateNested()
  @Type(() => LocationDto)
  businessAddress: LocationDto

  @IsString()
  @IsNotEmpty()
  contactPhone: string

  @IsEmail()
  @IsNotEmpty()
  contactEmail: string

  @IsString()
  @IsOptional()
  description?: string
}
