import { IsOptional, IsEnum, IsDateString, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { DisputeStatus, IssueType } from '../../../common/enums'

export class ListDisputesDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus

  @IsOptional()
  @IsEnum(IssueType)
  issueType?: IssueType

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

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
