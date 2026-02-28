import { IsOptional, IsEnum } from 'class-validator'

export enum BookingFilterType {
  ACTIVE = 'active',
  PAST = 'past',
  ALL = 'all',
}

export class BookingFiltersDto {
  @IsOptional()
  @IsEnum(BookingFilterType)
  filter?: BookingFilterType = BookingFilterType.ALL
}
