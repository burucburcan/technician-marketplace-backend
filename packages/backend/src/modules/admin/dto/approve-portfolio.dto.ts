import { IsOptional, IsString } from 'class-validator'

export class ApprovePortfolioDto {
  @IsOptional()
  @IsString()
  notes?: string
}
