import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { UserRole } from '../../../common/enums'

export class ListUsersDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20
}
