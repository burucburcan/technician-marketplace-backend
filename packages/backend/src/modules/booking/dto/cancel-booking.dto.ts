import { IsString, IsNotEmpty, MaxLength } from 'class-validator'

/**
 * DTO for cancelling a booking
 * Requirement 6.6: Platform SHALL record cancellation reason and notify professional
 */
export class CancelBookingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string
}
