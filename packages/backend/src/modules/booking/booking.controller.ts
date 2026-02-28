import { Controller, Post, Body, UseGuards, Request, Get, Param, Put, Query } from '@nestjs/common'
import { BookingService } from './booking.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto'
import { CancelBookingDto } from './dto/cancel-booking.dto'
import { BookingFiltersDto } from './dto/booking-filters.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Booking } from '../../entities/booking.entity'
import { RequestWithUser } from '../../common/types/request.types'

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  async createBooking(
    @Request() req: RequestWithUser,
    @Body() createBookingDto: CreateBookingDto
  ): Promise<Booking> {
    return await this.bookingService.createBooking(req.user.userId, createBookingDto)
  }

  @Get(':id')
  async getBooking(@Param('id') id: string): Promise<Booking> {
    return await this.bookingService.findById(id)
  }

  @Put(':id/status')
  async updateBookingStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateBookingStatusDto
  ): Promise<Booking> {
    return await this.bookingService.updateBookingStatus(id, updateStatusDto)
  }

  /**
   * Get bookings for a user with optional filtering
   * Requirement 6.5: Show active and past bookings separately
   * Requirement 6.8: Include progress photos for viewing
   */
  @Get('users/:userId')
  async getUserBookings(
    @Param('userId') userId: string,
    @Query() filters: BookingFiltersDto
  ): Promise<Booking[]> {
    return await this.bookingService.getUserBookings(userId, filters.filter || 'all')
  }

  /**
   * Get bookings for a professional with optional filtering
   * Requirement 6.5: Show active and past bookings separately
   */
  @Get('professionals/:professionalId')
  async getProfessionalBookings(
    @Param('professionalId') professionalId: string,
    @Query() filters: BookingFiltersDto
  ): Promise<Booking[]> {
    return await this.bookingService.getProfessionalBookings(
      professionalId,
      filters.filter || 'all'
    )
  }

  /**
   * Cancel a booking with reason
   * Requirement 6.6: Record cancellation reason and notify professional
   */
  @Put(':id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body() cancelDto: CancelBookingDto
  ): Promise<Booking> {
    return await this.bookingService.cancelBooking(id, cancelDto.reason)
  }
}
