import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator'

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1000)
  reason: string
}
