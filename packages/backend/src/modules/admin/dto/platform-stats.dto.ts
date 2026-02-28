import { IsOptional, IsEnum } from 'class-validator'
import { Type } from 'class-transformer'
import { ProfessionalType } from '../../../common/enums'

export class GetPlatformStatsDto {
  @IsOptional()
  @IsEnum(ProfessionalType)
  professionalType?: ProfessionalType
}

export class PlatformStatsResponseDto {
  totalUsers: UserStatsByRole
  totalBookings: BookingStatsByStatus
  totalRevenue: RevenueStats
  professionalStats: ProfessionalStats
  dashboardMetrics: DashboardMetrics
}

export interface UserStatsByRole {
  total: number
  byRole: {
    user: number
    professional: number
    provider: number
    supplier: number
    admin: number
  }
}

export interface BookingStatsByStatus {
  total: number
  byStatus: {
    pending: number
    confirmed: number
    inProgress: number
    completed: number
    cancelled: number
    rejected: number
    disputed: number
    resolved: number
  }
}

export interface RevenueStats {
  totalRevenue: number
  completedBookingsRevenue: number
  averageBookingValue: number
  currency: string
}

export interface ProfessionalStats {
  total: number
  byType: {
    handyman: number
    artist: number
  }
  verified: number
  available: number
  averageRating: number
}

export interface DashboardMetrics {
  activeUsers: number
  activeBookings: number
  recentBookings: number
  recentUsers: number
}
