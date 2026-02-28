import { Test, TestingModule } from '@nestjs/testing'
import { AdminService } from './admin.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Booking } from '../../entities/booking.entity'
import { Payment } from '../../entities/payment.entity'
import { Dispute } from '../../entities/dispute.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { DisputeStatus, IssueType, BookingStatus } from '../../common/enums'
import { NotFoundException, BadRequestException } from '@nestjs/common'

describe('AdminService - Dispute Management', () => {
  let service: AdminService
  let disputeRepository: any
  let bookingRepository: any
  let activityLogService: any

  const mockDisputeRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockBookingRepository = {
    save: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SupplierProfile),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Dispute),
          useValue: mockDisputeRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
    disputeRepository = module.get(getRepositoryToken(Dispute))
    bookingRepository = module.get(getRepositoryToken(Booking))
    activityLogService = module.get(ActivityLogService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('listDisputes', () => {
    it('should list disputes with pagination', async () => {
      const mockDisputes = [
        {
          id: '1',
          issueType: IssueType.POOR_QUALITY,
          status: DisputeStatus.OPEN,
          description: 'Test dispute',
        },
      ]

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockDisputes, 1]),
      }

      mockDisputeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      const result = await service.listDisputes({ page: 1, limit: 20 }, 'admin-id')

      expect(result).toEqual({
        data: mockDisputes,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
      expect(mockActivityLogService.logActivity).toHaveBeenCalled()
    })

    it('should filter disputes by status', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }

      mockDisputeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      await service.listDisputes({ status: DisputeStatus.OPEN, page: 1, limit: 20 }, 'admin-id')

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('dispute.status = :status', {
        status: DisputeStatus.OPEN,
      })
    })

    it('should filter disputes by issue type', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }

      mockDisputeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

      await service.listDisputes({ issueType: IssueType.NO_SHOW, page: 1, limit: 20 }, 'admin-id')

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('dispute.issueType = :issueType', {
        issueType: IssueType.NO_SHOW,
      })
    })
  })

  describe('getDisputeDetails', () => {
    it('should return dispute details', async () => {
      const mockDispute = {
        id: 'dispute-id',
        issueType: IssueType.POOR_QUALITY,
        status: DisputeStatus.OPEN,
        description: 'Test dispute',
      }

      mockDisputeRepository.findOne.mockResolvedValue(mockDispute)

      const result = await service.getDisputeDetails('dispute-id', 'admin-id')

      expect(result).toEqual(mockDispute)
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dispute_viewed',
          resourceId: 'dispute-id',
        })
      )
    })

    it('should throw NotFoundException if dispute not found', async () => {
      mockDisputeRepository.findOne.mockResolvedValue(null)

      await expect(service.getDisputeDetails('invalid-id', 'admin-id')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('resolveDispute', () => {
    it('should resolve a dispute', async () => {
      const mockDispute = {
        id: 'dispute-id',
        issueType: IssueType.POOR_QUALITY,
        status: DisputeStatus.OPEN,
        description: 'Test dispute',
        bookingId: 'booking-id',
        booking: {
          id: 'booking-id',
          status: BookingStatus.DISPUTED,
        },
      }

      const resolvedDispute = {
        ...mockDispute,
        status: DisputeStatus.RESOLVED,
        resolutionNotes: 'Issue resolved',
        adminAction: 'Refund issued',
        resolvedBy: 'admin-id',
        resolvedAt: expect.any(Date),
      }

      mockDisputeRepository.findOne.mockResolvedValue(mockDispute)
      mockDisputeRepository.save.mockResolvedValue(resolvedDispute)
      mockBookingRepository.save.mockResolvedValue({
        ...mockDispute.booking,
        status: BookingStatus.RESOLVED,
      })

      const result = await service.resolveDispute(
        'dispute-id',
        {
          resolutionNotes: 'Issue resolved',
          adminAction: 'Refund issued',
        },
        'admin-id'
      )

      expect(result.status).toBe(DisputeStatus.RESOLVED)
      expect(result.resolutionNotes).toBe('Issue resolved')
      expect(result.adminAction).toBe('Refund issued')
      expect(mockBookingRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BookingStatus.RESOLVED,
        })
      )
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'dispute_resolved',
          resourceId: 'dispute-id',
        })
      )
    })

    it('should throw NotFoundException if dispute not found', async () => {
      mockDisputeRepository.findOne.mockResolvedValue(null)

      await expect(
        service.resolveDispute(
          'invalid-id',
          {
            resolutionNotes: 'Issue resolved',
          },
          'admin-id'
        )
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException if dispute already resolved', async () => {
      const mockDispute = {
        id: 'dispute-id',
        status: DisputeStatus.RESOLVED,
      }

      mockDisputeRepository.findOne.mockResolvedValue(mockDispute)

      await expect(
        service.resolveDispute(
          'dispute-id',
          {
            resolutionNotes: 'Issue resolved',
          },
          'admin-id'
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if dispute already closed', async () => {
      const mockDispute = {
        id: 'dispute-id',
        status: DisputeStatus.CLOSED,
      }

      mockDisputeRepository.findOne.mockResolvedValue(mockDispute)

      await expect(
        service.resolveDispute(
          'dispute-id',
          {
            resolutionNotes: 'Issue resolved',
          },
          'admin-id'
        )
      ).rejects.toThrow(BadRequestException)
    })
  })
})
