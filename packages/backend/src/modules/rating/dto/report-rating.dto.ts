import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

export class ReportRatingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string
}
