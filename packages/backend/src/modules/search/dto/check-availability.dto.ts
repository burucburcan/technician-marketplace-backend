import { IsString, IsDateString, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CheckAvailabilityDto {
  @IsString()
  professionalId: string

  @IsDateString()
  date: string

  @IsNumber()
  @Type(() => Number)
  @Min(30)
  duration: number // minutes
}
