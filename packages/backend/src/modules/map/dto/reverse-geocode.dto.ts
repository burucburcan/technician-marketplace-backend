import { IsNumber, IsNotEmpty } from 'class-validator'

export class ReverseGeocodeDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number

  @IsNumber()
  @IsNotEmpty()
  longitude: number
}

export class ReverseGeocodeResponseDto {
  address: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}
