import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class SuspendUserDto {
  @IsBoolean()
  isSuspended: boolean

  @IsOptional()
  @IsString()
  reason?: string
}
