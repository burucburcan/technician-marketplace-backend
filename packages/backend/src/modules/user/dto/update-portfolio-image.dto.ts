import { IsString, IsOptional, IsDateString, IsArray, MaxLength } from 'class-validator'

export class UpdatePortfolioImageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsOptional()
  @IsDateString()
  completionDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dimensions?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materials?: string[]
}
