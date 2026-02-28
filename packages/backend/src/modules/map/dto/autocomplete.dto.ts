import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class AutocompleteDto {
  @IsString()
  @IsNotEmpty()
  input: string

  @IsOptional()
  @IsString()
  sessionToken?: string

  @IsOptional()
  @IsString()
  language?: string
}

export class AutocompletePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export class AutocompleteResponseDto {
  predictions: AutocompletePrediction[]
}
