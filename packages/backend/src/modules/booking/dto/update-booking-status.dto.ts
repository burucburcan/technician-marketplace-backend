import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { BookingStatus } from '../../../common/enums/booking-status.enum'

export class ProgressPhotoDto {
  @IsString()
  url: string

  @IsOptional()
  @IsString()
  caption?: string
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProgressPhotoDto)
  progressPhotos?: ProgressPhotoDto[]
}
