import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProviderService } from './provider.service'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { User } from '../../entities/user.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { UserRole, ProfessionalType, VerificationStatus } from '../../common/enums'
import { VerifyProfessionalDto } from './dto'

describe('ProviderService - Professional Verification', () => {
  let service: ProviderService
  let professionalProfileRepository: Repository<ProfessionalProfile>
  let userRepository: Repository<User>
  let activityLogService: ActivityLogService

  const mockProviderId = 'provider-uuid'
  const mockProfessionalId = 'professional-uuid'
  const mockUserId = 'user-uuid'

  const mockProvider: Partial<User> = {
    id: mockProviderId,
    email: 'provider@test.com',
    passwordHash: 'hash',
    role: UserRole.PROVIDER,
    isEmailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockProfessionalProfile: Partial<ProfessionalProfile> = {
    id: mockProfessionalId,
    userId: mockUserId,
    providerId: mockProviderId,
    professionalType: ProfessionalType.HANDYMAN,
    businessName: 'Test Business',
    experienceYears: 5,
    hourlyRate: 50,
    serviceRadius: 25,
    workingHours: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '17:00' }],
      saturday: [],
      sunday: [],
    },
    verificationStatus: VerificationStatus.PENDING,
    isAvailable: true,
    rating: 0,
    totalJobs: 0,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ActivityLogService,
          useValue: {
            logActivity: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<ProviderService>(ProviderService)
    professionalProfileRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    activityLogService = module.get<ActivityLogService>(ActivityLogService)
  })

  describe('verifyProfessional', () => {
    it('should verify a professional successfully', async () => {
      const verifyDto: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.VERIFIED,
        notes: 'All documents verified',
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockProvider as User)
      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile as ProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.VERIFIED,
      } as ProfessionalProfile)

      // Mock getProfessional method
      jest.spyOn(service, 'getProfessional').mockResolvedValue({
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.VERIFIED,
      } as ProfessionalProfile)

      const result = await service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto)

      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED)
      expect(professionalProfileRepository.save).toHaveBeenCalled()
      expect(activityLogService.logActivity).toHaveBeenCalledWith({
        userId: mockProviderId,
        action: 'professional_verification_updated',
        resource: 'professional_profile',
        metadata: {
          professionalId: mockProfessionalId,
          verificationStatus: VerificationStatus.VERIFIED,
          notes: 'All documents verified',
        },
      })
    })

    it('should reject a professional', async () => {
      const verifyDto: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.REJECTED,
        notes: 'Missing required certificates',
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockProvider as User)
      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile as ProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.REJECTED,
      } as ProfessionalProfile)

      jest.spyOn(service, 'getProfessional').mockResolvedValue({
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.REJECTED,
      } as ProfessionalProfile)

      const result = await service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto)

      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED)
      expect(activityLogService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            notes: 'Missing required certificates',
          }),
        })
      )
    })

    it('should throw NotFoundException when provider does not exist', async () => {
      const verifyDto: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.VERIFIED,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when professional does not exist', async () => {
      const verifyDto: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.VERIFIED,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockProvider as User)
      jest.spyOn(professionalProfileRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when professional does not belong to provider', async () => {
      const verifyDto: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.VERIFIED,
      }

      const professionalWithDifferentProvider = {
        ...mockProfessionalProfile,
        providerId: 'different-provider-id',
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockProvider as User)
      jest.spyOn(professionalProfileRepository, 'findOne').mockResolvedValue(null)

      await expect(
        service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto)
      ).rejects.toThrow(NotFoundException)
    })

    it('should update verification status from pending to verified', async () => {
      const verifyDto: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.VERIFIED,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockProvider as User)
      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile as ProfessionalProfile)

      const savedProfile = {
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.VERIFIED,
      }
      jest
        .spyOn(professionalProfileRepository, 'save')
        .mockResolvedValue(savedProfile as ProfessionalProfile)
      jest.spyOn(service, 'getProfessional').mockResolvedValue(savedProfile as ProfessionalProfile)

      const result = await service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto)

      expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED)
      expect(professionalProfileRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: VerificationStatus.VERIFIED,
        })
      )
    })

    it('should allow updating verification status multiple times', async () => {
      // First update to verified
      const verifyDto1: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.VERIFIED,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockProvider as User)
      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(mockProfessionalProfile as ProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.VERIFIED,
      } as ProfessionalProfile)
      jest.spyOn(service, 'getProfessional').mockResolvedValue({
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.VERIFIED,
      } as ProfessionalProfile)

      await service.verifyProfessional(mockProviderId, mockProfessionalId, verifyDto1)

      // Then update to rejected
      const verifyDto2: VerifyProfessionalDto = {
        verificationStatus: VerificationStatus.REJECTED,
        notes: 'Certificate expired',
      }

      const verifiedProfile = {
        ...mockProfessionalProfile,
        verificationStatus: VerificationStatus.VERIFIED,
      }

      jest
        .spyOn(professionalProfileRepository, 'findOne')
        .mockResolvedValue(verifiedProfile as ProfessionalProfile)
      jest.spyOn(professionalProfileRepository, 'save').mockResolvedValue({
        ...verifiedProfile,
        verificationStatus: VerificationStatus.REJECTED,
      } as ProfessionalProfile)
      jest.spyOn(service, 'getProfessional').mockResolvedValue({
        ...verifiedProfile,
        verificationStatus: VerificationStatus.REJECTED,
      } as ProfessionalProfile)

      const result = await service.verifyProfessional(
        mockProviderId,
        mockProfessionalId,
        verifyDto2
      )

      expect(result.verificationStatus).toBe(VerificationStatus.REJECTED)
    })
  })
})
