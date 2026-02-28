import { IsString, IsNotEmpty, IsOptional, IsObject, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

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

  @IsObject()
  coordinates: {
    latitude: number
    longitude: number
  }
}

class PreferencesDto {
  @IsOptional()
  emailNotifications?: boolean

  @IsOptional()
  smsNotifications?: boolean

  @IsOptional()
  pushNotifications?: boolean

  @IsOptional()
  @IsString()
  currency?: string
}

export class CreateUserProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string

  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsOptional()
  @IsString()
  language?: string

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto

  @IsOptional()
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences?: PreferencesDto
}
