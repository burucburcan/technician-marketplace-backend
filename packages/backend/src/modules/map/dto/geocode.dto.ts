import { IsString, IsNotEmpty } from 'class-validator'

export class GeocodeDto {
  @IsString()
  @IsNotEmpty()
  address: string
}

export class GeocodeResponseDto {
  latitude: number
  longitude: number
  formattedAddress: string
}
