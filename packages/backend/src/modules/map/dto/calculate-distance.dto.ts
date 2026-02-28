import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'

export enum DistanceUnit {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

export class CalculateDistanceDto {
  @IsString()
  @IsNotEmpty()
  origin: string

  @IsString()
  @IsNotEmpty()
  destination: string

  @IsOptional()
  @IsEnum(DistanceUnit)
  units?: DistanceUnit
}

export class DistanceResponseDto {
  distance: number // in kilometers or miles
  duration: number // in seconds
  distanceText: string
  durationText: string
}
