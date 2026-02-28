import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdminService } from './admin.service'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Booking } from '../../entities/booking.entity'
import { Payment } from '../../entities/payment.entity'
import { Dispute } from '../../entities/dispute.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { ApprovalStatus, ProfessionalType } from '../../common/enums'
import { NotFoundException, BadRequestException } from '@nestjs/common'

describe('AdminService - Portfolio Approval', () => {
  let service: AdminService
  let portfolioItemRepository: Repository<PortfolioItem>
  let activityLogService: ActivityLogService

  const mockPortfolioItemRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn(),
  }

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
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
          useValue: {},
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Dispute),
          useValue: {},
        },
        {
          provide: getRepositoryToken(PortfolioItem),
          useValue: mockPortfolioItemRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)
    portfolioItemRepository = module.get<Repository<PortfolioItem>>(
      getRepositoryToken(PortfolioItem)
    )
    activityLogService = module.get<ActivityLogService>(ActivityLogService)

    jest.clearAllMocks()
  })

  describe('listPendingPortfolios', () => {
    it('should return pending portfolio items', async () => {
      const mockPortfolios = [
        {
          id: 'portfolio-1',
          professionalId: 'prof-1',
          title: 'Test Portfolio',
          approvalStatus: ApprovalStatus.PENDING,
          professional: {
            id: 'prof-1',
            businessName: 'Test Artist',
            professionalType: ProfessionalType.ARTIST,
            user: {
              id: 'user-1',
              email: 'artist@test.com',
              profile: {
                id: 'profile-1',
                firstName: 'John',
                lastName: 'Doe',
              },
            },
          },
        },
      ]

      mockPortfolioItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockPortfolios, 1])

      const result = await service.listPendingPortfolios({ page: 1, limit: 20 }, 'admin-1')

      expect(result).toEqual({
        data: mockPortfolios,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
      expect(mockPortfolioItemRepository.createQueryBuilder).toHaveBeenCalledWith('portfolio')
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('portfolio.approvalStatus = :status', {
        status: ApprovalStatus.PENDING,
      })
      expect(activityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'pending_portfolios_listed',
        resource: 'portfolio_item',
        resourceId: 'list',
        metadata: {
          filters: { page: 1, limit: 20 },
          resultCount: 1,
        },
      })
    })

    it('should filter by search term', async () => {
      mockPortfolioItemRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])

      await service.listPendingPortfolios({ search: 'test', page: 1, limit: 20 }, 'admin-1')

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('portfolio.title ILIKE :search'),
        { search: '%test%' }
      )
    })
  })

  describe('approvePortfolio', () => {
    it('should approve a pending portfolio item', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        professionalId: 'prof-1',
        title: 'Test Portfolio',
        approvalStatus: ApprovalStatus.PENDING,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        professional: {
          id: 'prof-1',
          user: {
            id: 'user-1',
            profile: {
              id: 'profile-1',
            },
          },
        },
      }

      const approvedPortfolio = {
        ...mockPortfolio,
        approvalStatus: ApprovalStatus.APPROVED,
        reviewedBy: 'admin-1',
        reviewedAt: expect.any(Date),
      }

      mockPortfolioItemRepository.findOne.mockResolvedValue(mockPortfolio)
      mockPortfolioItemRepository.save.mockResolvedValue(approvedPortfolio)

      const result = await service.approvePortfolio(
        'portfolio-1',
        { notes: 'Looks good' },
        'admin-1'
      )

      expect(result.approvalStatus).toBe(ApprovalStatus.APPROVED)
      expect(result.reviewedBy).toBe('admin-1')
      expect(result.reviewedAt).toBeDefined()
      expect(mockPortfolioItemRepository.save).toHaveBeenCalled()
      expect(activityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'portfolio_approved',
        resource: 'portfolio_item',
        resourceId: 'portfolio-1',
        metadata: {
          portfolioTitle: 'Test Portfolio',
          professionalId: 'prof-1',
          notes: 'Looks good',
        },
      })
    })

    it('should throw NotFoundException if portfolio not found', async () => {
      mockPortfolioItemRepository.findOne.mockResolvedValue(null)

      await expect(service.approvePortfolio('non-existent', {}, 'admin-1')).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException if portfolio already approved', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        approvalStatus: ApprovalStatus.APPROVED,
      }

      mockPortfolioItemRepository.findOne.mockResolvedValue(mockPortfolio)

      await expect(service.approvePortfolio('portfolio-1', {}, 'admin-1')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException if portfolio already rejected', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        approvalStatus: ApprovalStatus.REJECTED,
      }

      mockPortfolioItemRepository.findOne.mockResolvedValue(mockPortfolio)

      await expect(service.approvePortfolio('portfolio-1', {}, 'admin-1')).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('rejectPortfolio', () => {
    it('should reject a pending portfolio item', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        professionalId: 'prof-1',
        title: 'Test Portfolio',
        approvalStatus: ApprovalStatus.PENDING,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        professional: {
          id: 'prof-1',
          user: {
            id: 'user-1',
            profile: {
              id: 'profile-1',
            },
          },
        },
      }

      const rejectedPortfolio = {
        ...mockPortfolio,
        approvalStatus: ApprovalStatus.REJECTED,
        rejectionReason: 'Inappropriate content',
        reviewedBy: 'admin-1',
        reviewedAt: expect.any(Date),
      }

      mockPortfolioItemRepository.findOne.mockResolvedValue(mockPortfolio)
      mockPortfolioItemRepository.save.mockResolvedValue(rejectedPortfolio)

      const result = await service.rejectPortfolio(
        'portfolio-1',
        { reason: 'Inappropriate content' },
        'admin-1'
      )

      expect(result.approvalStatus).toBe(ApprovalStatus.REJECTED)
      expect(result.rejectionReason).toBe('Inappropriate content')
      expect(result.reviewedBy).toBe('admin-1')
      expect(result.reviewedAt).toBeDefined()
      expect(mockPortfolioItemRepository.save).toHaveBeenCalled()
      expect(activityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'admin-1',
        action: 'portfolio_rejected',
        resource: 'portfolio_item',
        resourceId: 'portfolio-1',
        metadata: {
          portfolioTitle: 'Test Portfolio',
          professionalId: 'prof-1',
          rejectionReason: 'Inappropriate content',
        },
      })
    })

    it('should throw NotFoundException if portfolio not found', async () => {
      mockPortfolioItemRepository.findOne.mockResolvedValue(null)

      await expect(
        service.rejectPortfolio('non-existent', { reason: 'test' }, 'admin-1')
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw BadRequestException if portfolio already approved', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        approvalStatus: ApprovalStatus.APPROVED,
      }

      mockPortfolioItemRepository.findOne.mockResolvedValue(mockPortfolio)

      await expect(
        service.rejectPortfolio('portfolio-1', { reason: 'test' }, 'admin-1')
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException if portfolio already rejected', async () => {
      const mockPortfolio = {
        id: 'portfolio-1',
        approvalStatus: ApprovalStatus.REJECTED,
      }

      mockPortfolioItemRepository.findOne.mockResolvedValue(mockPortfolio)

      await expect(
        service.rejectPortfolio('portfolio-1', { reason: 'test' }, 'admin-1')
      ).rejects.toThrow(BadRequestException)
    })
  })
})
