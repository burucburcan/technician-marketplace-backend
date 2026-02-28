import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ActivityLog } from '../../entities/activity-log.entity'

export interface LogActivityParams {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>
  ) {}

  async logActivity(params: LogActivityParams): Promise<ActivityLog> {
    const log = this.activityLogRepository.create({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    })

    return this.activityLogRepository.save(log)
  }

  async getFailedLoginAttempts(
    email: string,
    timeWindow: number = 15 * 60 * 1000 // 15 minutes
  ): Promise<number> {
    const since = new Date(Date.now() - timeWindow)

    const count = await this.activityLogRepository
      .createQueryBuilder('log')
      .where('log.action = :action', { action: 'failed_login' })
      .andWhere('log.resource = :resource', { resource: 'auth' })
      .andWhere("log.metadata->>'email' = :email", { email })
      .andWhere('log.timestamp >= :since', { since })
      .getCount()

    return count
  }

  async getFailedLoginAttemptsForUser(
    userId: string,
    timeWindow: number = 15 * 60 * 1000 // 15 minutes
  ): Promise<number> {
    const since = new Date(Date.now() - timeWindow)

    const count = await this.activityLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.action = :action', { action: 'failed_login' })
      .andWhere('log.resource = :resource', { resource: 'auth' })
      .andWhere('log.timestamp >= :since', { since })
      .getCount()

    return count
  }
}
