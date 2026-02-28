import { IsString, IsNotEmpty, IsEnum, ValidateNested, IsOptional } from 'class-validator'
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
  @IsOptional()
  coordinates?: CoordinatesDto
}

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  shippingAddress: LocationDto

  @ValidateNested()
  @Type(() => LocationDto)
  @IsNotEmpty()
  billingAddress: LocationDto

  @IsString()
  @IsNotEmpty()
  paymentMethod: string
}
