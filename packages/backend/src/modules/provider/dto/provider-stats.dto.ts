import { IsOptional, IsEnum } from 'class-validator'
import { ProfessionalType } from '../../../common/enums'

export class ProviderStatsQueryDto {
  @IsOptional()
  @IsEnum(ProfessionalType)
  professionalType?: ProfessionalType
}

export class ProfessionalStatsDto {
  professionalId: string
  professionalName: string
  professionalType: ProfessionalType
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  averageRating: number
  totalRatings: number
  completionRate: number
  totalRevenue: number
}

export class ProviderStatsDto {
  providerId: string
  totalProfessionals: number
  professionalsByType: {
    handyman: number
    artist: number
  }
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  pendingBookings: number
  inProgressBookings: number
  completionRate: number
  averageRating: number
  totalRatings: number
  totalRevenue: number
  professionals: ProfessionalStatsDto[]
}
