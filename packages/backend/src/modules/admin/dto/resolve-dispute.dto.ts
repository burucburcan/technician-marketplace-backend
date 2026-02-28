import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator'

export class ResolveDisputeDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  resolutionNotes: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminAction?: string
}
