import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator'

export enum ModerationAction {
  APPROVE = 'approved',
  REJECT = 'rejected',
  FLAG = 'flagged',
}

export class ModerateRatingDto {
  @IsEnum(ModerationAction)
  action: ModerationAction

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string
}
