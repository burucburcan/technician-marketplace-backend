import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from './user.controller'
import { UserService } from './user.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

describe('UserController', () => {
  let controller: UserController
  let userService: UserService

  const mockUserService = {
    getProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    updatePreferences: jest.fn(),
    uploadProfilePhoto: jest.fn(),
    deleteAccount: jest.fn(),
    exportUserData: jest.fn(),
  }

  const mockRequest = {
    user: { id: 'user-1', email: 'test@example.com' },
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<UserController>(UserController)
    userService = module.get<UserService>(UserService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUserService.getProfile.mockResolvedValue(mockUserProfile)

      const result = await controller.getProfile('user-1')

      expect(result).toEqual(mockUserProfile)
      expect(mockUserService.getProfile).toHaveBeenCalledWith('user-1')
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

    it('should create user profile', async () => {
      mockUserService.createProfile.mockResolvedValue(mockUserProfile)

      const result = await controller.createProfile('user-1', createProfileDto)

      expect(result).toEqual(mockUserProfile)
      expect(mockUserService.createProfile).toHaveBeenCalledWith('user-1', createProfileDto)
    })
  })

  describe('updateProfile', () => {
    const updateProfileDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    }

    it('should update user profile', async () => {
      const updatedProfile = { ...mockUserProfile, ...updateProfileDto }
      mockUserService.updateProfile.mockResolvedValue(updatedProfile)

      const result = await controller.updateProfile('user-1', updateProfileDto, mockRequest as any)

      expect(result).toEqual(updatedProfile)
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        'user-1',
        updateProfileDto,
        'user-1'
      )
    })
  })

  describe('updatePreferences', () => {
    const updatePreferencesDto = {
      language: 'en',
      emailNotifications: false,
    }

    it('should update user preferences', async () => {
      const updatedProfile = {
        ...mockUserProfile,
        language: 'en',
        preferences: {
          ...mockUserProfile.preferences,
          emailNotifications: false,
        },
      }
      mockUserService.updatePreferences.mockResolvedValue(updatedProfile)

      const result = await controller.updatePreferences('user-1', updatePreferencesDto, mockRequest as any)

      expect(result).toEqual(updatedProfile)
      expect(mockUserService.updatePreferences).toHaveBeenCalledWith(
        'user-1',
        updatePreferencesDto,
        'user-1'
      )
    })
  })

  describe('uploadProfilePhoto', () => {
    const mockFile = {
      mimetype: 'image/jpeg',
      size: 1024 * 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File

    it('should upload profile photo', async () => {
      const avatarUrl = 'https://s3.amazonaws.com/bucket/profile-photos/user-1/photo.jpg'
      mockUserService.uploadProfilePhoto.mockResolvedValue({ avatarUrl })

      const result = await controller.uploadProfilePhoto('user-1', mockFile, mockRequest as any)

      expect(result).toEqual({ avatarUrl })
      expect(mockUserService.uploadProfilePhoto).toHaveBeenCalledWith('user-1', mockFile, 'user-1')
    })
  })

  describe('deleteAccount', () => {
    it('should delete user account', async () => {
      const deleteResult = { message: 'Account deleted successfully' }
      mockUserService.deleteAccount.mockResolvedValue(deleteResult)

      const result = await controller.deleteAccount('user-1', mockRequest as any)

      expect(result).toEqual(deleteResult)
      expect(mockUserService.deleteAccount).toHaveBeenCalledWith('user-1', 'user-1')
    })
  })

  describe('exportUserData', () => {
    it('should export user data', async () => {
      const exportData = {
        exportDate: '2024-01-01T00:00:00.000Z',
        userData: mockUserProfile,
      }
      mockUserService.exportUserData.mockResolvedValue(exportData)

      const result = await controller.exportUserData('user-1', mockRequest as any)

      expect(result).toEqual(exportData)
      expect(mockUserService.exportUserData).toHaveBeenCalledWith('user-1', 'user-1')
    })
  })
})
