import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { UserService } from './user.service'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { UserRole } from '../../common/enums'

describe('UserService', () => {
  let service: UserService
  let userRepository: Repository<User>
  let userProfileRepository: Repository<UserProfile>
  let activityLogService: ActivityLogService
  let s3Service: S3Service

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: UserRole.USER,
    isEmailVerified: true,
  }

  const mockUserProfile = {
    id: 'profile-1',
    userId: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    language: 'es',
    location: {
      address: '123 Main St',
      city: 'Mexico City',
      state: 'CDMX',
      country: 'Mexico',
      postalCode: '12345',
      coordinates: { latitude: 19.4326, longitude: -99.1332 },
    },
    preferences: {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      currency: 'MXN',
    },
  }

  const mockUserRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
  }

  const mockUserProfileRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn(),
  }

  const mockS3Service = {
    uploadProfilePhoto: jest.fn(),
    deleteProfilePhoto: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    userProfileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile))
    activityLogService = module.get<ActivityLogService>(ActivityLogService)
    s3Service = module.get<S3Service>(S3Service)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should return user profile when found', async () => {
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)

      const result = await service.getProfile('user-1')

      expect(result).toEqual(mockUserProfile)
      expect(mockUserProfileRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['user'],
      })
    })

    it('should throw NotFoundException when profile not found', async () => {
      mockUserProfileRepository.findOne.mockResolvedValue(null)

      await expect(service.getProfile('user-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('createProfile', () => {
    const createProfileDto = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      location: {
        address: '123 Main St',
        city: 'Mexico City',
        state: 'CDMX',
        country: 'Mexico',
        postalCode: '12345',
        coordinates: { latitude: 19.4326, longitude: -99.1332 },
      },
    }

    it('should create user profile successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockUserProfileRepository.findOne.mockResolvedValue(null)
      mockUserProfileRepository.create.mockReturnValue(mockUserProfile)
      mockUserProfileRepository.save.mockResolvedValue(mockUserProfile)

      const result = await service.createProfile('user-1', createProfileDto)

      expect(result).toEqual(mockUserProfile)
      expect(mockUserProfileRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        ...createProfileDto,
        language: 'es',
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          currency: 'MXN',
        },
      })
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'profile_created',
        resource: 'user_profile',
        metadata: { profileId: mockUserProfile.id },
      })
    })

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.createProfile('user-1', createProfileDto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException when profile already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser)
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)

      await expect(service.createProfile('user-1', createProfileDto)).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('updateProfile', () => {
    const updateProfileDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    }

    it('should update user profile successfully', async () => {
      const updatedProfile = { ...mockUserProfile, ...updateProfileDto }
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)
      mockUserProfileRepository.save.mockResolvedValue(updatedProfile)

      const result = await service.updateProfile('user-1', updateProfileDto, 'user-1')

      expect(result).toEqual(updatedProfile)
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'profile_updated',
        resource: 'user_profile',
        metadata: {
          profileId: mockUserProfile.id,
          updatedFields: ['firstName', 'lastName'],
        },
      })
    })

    it('should throw ForbiddenException when user tries to update another user profile', async () => {
      await expect(service.updateProfile('user-1', updateProfileDto, 'user-2')).rejects.toThrow(
        ForbiddenException
      )
    })

    it('should throw NotFoundException when profile not found', async () => {
      mockUserProfileRepository.findOne.mockResolvedValue(null)

      await expect(service.updateProfile('user-1', updateProfileDto, 'user-1')).rejects.toThrow(
        NotFoundException
      )
    })
  })

  describe('uploadProfilePhoto', () => {
    const mockFile = {
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test'),
    } as Express.Multer.File

    it('should upload profile photo successfully', async () => {
      const avatarUrl = 'https://s3.amazonaws.com/bucket/profile-photos/user-1/photo.jpg'
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)
      mockS3Service.uploadProfilePhoto.mockResolvedValue(avatarUrl)
      mockUserProfileRepository.save.mockResolvedValue({ ...mockUserProfile, avatarUrl })

      const result = await service.uploadProfilePhoto('user-1', mockFile, 'user-1')

      expect(result).toEqual({ avatarUrl })
      expect(mockS3Service.uploadProfilePhoto).toHaveBeenCalledWith('user-1', mockFile)
    })

    it('should throw ForbiddenException when user tries to upload photo for another user', async () => {
      await expect(service.uploadProfilePhoto('user-1', mockFile, 'user-2')).rejects.toThrow(
        ForbiddenException
      )
    })

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'text/plain' }
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)

      await expect(service.uploadProfilePhoto('user-1', invalidFile, 'user-1')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException for file too large', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 } // 6MB
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)

      await expect(service.uploadProfilePhoto('user-1', largeFile, 'user-1')).rejects.toThrow(
        BadRequestException
      )
    })
  })

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      const userWithProfile = { ...mockUser, profile: mockUserProfile }
      mockUserRepository.findOne.mockResolvedValue(userWithProfile)
      mockUserRepository.remove.mockResolvedValue(userWithProfile)

      const result = await service.deleteAccount('user-1', 'user-1')

      expect(result).toEqual({ message: 'Account deleted successfully' })
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'account_deletion_requested',
        resource: 'user',
        metadata: {
          email: mockUser.email,
          role: mockUser.role,
        },
      })
    })

    it('should throw ForbiddenException when user tries to delete another user account', async () => {
      await expect(service.deleteAccount('user-1', 'user-2')).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.deleteAccount('user-1', 'user-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const userWithRelations = {
        ...mockUser,
        profile: mockUserProfile,
        professionalProfile: null,
        supplierProfile: null,
        bookings: [],
        orders: [],
        serviceRatings: [],
        productReviews: [],
        supplierReviews: [],
      }
      mockUserRepository.findOne.mockResolvedValue(userWithRelations)

      const result = await service.exportUserData('user-1', 'user-1')

      expect(result).toHaveProperty('exportDate')
      expect(result).toHaveProperty('userData')
      expect(result.userData).not.toHaveProperty('passwordHash')
      expect(result.userData).not.toHaveProperty('twoFactorSecret')
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'data_export_requested',
        resource: 'user',
        metadata: { email: mockUser.email },
      })
    })

    it('should throw ForbiddenException when user tries to export another user data', async () => {
      await expect(service.exportUserData('user-1', 'user-2')).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      await expect(service.exportUserData('user-1', 'user-1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updatePreferences', () => {
    const updatePreferencesDto = {
      language: 'en',
      emailNotifications: false,
    }

    it('should update user preferences successfully', async () => {
      const updatedProfile = {
        ...mockUserProfile,
        language: 'en',
        preferences: {
          ...mockUserProfile.preferences,
          emailNotifications: false,
        },
      }
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)
      mockUserProfileRepository.save.mockResolvedValue(updatedProfile)

      const result = await service.updatePreferences('user-1', updatePreferencesDto, 'user-1')

      expect(result.language).toBe('en')
      expect(result.preferences.emailNotifications).toBe(false)
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId: 'user-1',
        action: 'preferences_updated',
        resource: 'user_profile',
        metadata: {
          profileId: mockUserProfile.id,
          updatedFields: ['language', 'emailNotifications'],
        },
      })
    })

    it('should update only language when only language is provided', async () => {
      const languageOnlyDto = { language: 'en' }
      const updatedProfile = { ...mockUserProfile, language: 'en' }
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)
      mockUserProfileRepository.save.mockResolvedValue(updatedProfile)

      const result = await service.updatePreferences('user-1', languageOnlyDto, 'user-1')

      expect(result.language).toBe('en')
      expect(result.preferences).toEqual(mockUserProfile.preferences)
    })

    it('should update only preferences when language is not provided', async () => {
      const preferencesOnlyDto = { emailNotifications: false, smsNotifications: false }
      const updatedProfile = {
        ...mockUserProfile,
        preferences: {
          ...mockUserProfile.preferences,
          emailNotifications: false,
          smsNotifications: false,
        },
      }
      mockUserProfileRepository.findOne.mockResolvedValue(mockUserProfile)
      mockUserProfileRepository.save.mockResolvedValue(updatedProfile)

      const result = await service.updatePreferences('user-1', preferencesOnlyDto, 'user-1')

      expect(result.language).toBe('es')
      expect(result.preferences.emailNotifications).toBe(false)
      expect(result.preferences.smsNotifications).toBe(false)
    })

    it('should throw ForbiddenException when user tries to update another user preferences', async () => {
      await expect(
        service.updatePreferences('user-1', updatePreferencesDto, 'user-2')
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException when profile not found', async () => {
      mockUserProfileRepository.findOne.mockResolvedValue(null)

      await expect(
        service.updatePreferences('user-1', updatePreferencesDto, 'user-1')
      ).rejects.toThrow(NotFoundException)
    })
  })
})
