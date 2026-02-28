import { IsNotEmpty, IsString } from 'class-validator'

export class RejectPortfolioDto {
  @IsNotEmpty()
  @IsString()
  reason: string
}
