import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'
import * as fc from 'fast-check'
import { UserService } from './user.service'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { UserRole } from '../../common/enums'

/**
 * Property-Based Tests for User Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the user profile management system, ensuring correctness at scale.
 */
describe('UserService Property Tests', () => {
  let service: UserService
  let userRepository: any
  let userProfileRepository: any
  let activityLogService: ActivityLogService
  let s3Service: S3Service

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

    jest.clearAllMocks()
  })

  // Generators for property testing
  const userIdGen = fc.uuid()
  const nameGen = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
  const phoneGen = fc
    .string({ minLength: 10, maxLength: 15 })
    .map(s => '+' + s.replace(/[^0-9]/g, ''))
  const languageGen = fc.constantFrom('es', 'en')
  const currencyGen = fc.constantFrom('MXN', 'USD')

  const coordinatesGen = fc.record({
    latitude: fc.float({ min: -90, max: 90 }),
    longitude: fc.float({ min: -180, max: 180 }),
  })

  const locationGen = fc.record({
    address: fc.string({ minLength: 5, maxLength: 100 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 50 }),
    country: fc.string({ minLength: 2, maxLength: 50 }),
    postalCode: fc.string({ minLength: 3, maxLength: 10 }),
    coordinates: coordinatesGen,
  })

  const preferencesGen = fc.record({
    emailNotifications: fc.boolean(),
    smsNotifications: fc.boolean(),
    pushNotifications: fc.boolean(),
    currency: currencyGen,
  })

  const userProfileGen = fc.record({
    id: userIdGen,
    userId: userIdGen,
    firstName: nameGen,
    lastName: nameGen,
    phone: phoneGen,
    avatarUrl: fc.option(fc.webUrl(), { nil: null }),
    language: languageGen,
    location: locationGen,
    preferences: preferencesGen,
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })

  const updateProfileDtoGen = fc.record(
    {
      firstName: fc.option(nameGen, { nil: undefined }),
      lastName: fc.option(nameGen, { nil: undefined }),
      phone: fc.option(phoneGen, { nil: undefined }),
      language: fc.option(languageGen, { nil: undefined }),
      location: fc.option(locationGen, { nil: undefined }),
      preferences: fc.option(preferencesGen, { nil: undefined }),
    },
    { requiredKeys: [] }
  )

  /**
   * **Property 9: Profil Güncelleme Tutarlılığı**
   *
   * **Validates: Requirements 3.4**
   *
   * For any valid profile update data, when a profile update is performed,
   * the system must persist all changes consistently and the updated profile
   * must reflect exactly the changes that were requested.
   */
  describe('Property 9: Profile Update Consistency', () => {
    it('should consistently persist all profile updates for any valid update data', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          userProfileGen,
          updateProfileDtoGen,
          async (userId, existingProfile, updateDto) => {
            // Filter out undefined values to get actual updates
            const actualUpdates = Object.fromEntries(
              Object.entries(updateDto).filter(([, value]) => value !== undefined)
            )

            // Skip test if no actual updates
            fc.pre(Object.keys(actualUpdates).length > 0)

            // Setup existing profile
            mockUserProfileRepository.findOne.mockResolvedValue(existingProfile)

            // Create expected updated profile
            const expectedProfile = {
              ...existingProfile,
              ...actualUpdates,
              // Handle preferences merging
              preferences: updateDto.preferences
                ? { ...existingProfile.preferences, ...updateDto.preferences }
                : existingProfile.preferences,
            }

            mockUserProfileRepository.save.mockResolvedValue(expectedProfile)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const result = await service.updateProfile(userId, updateDto, userId)

            // Property: Update consistency - all requested changes must be reflected
            for (const [key, value] of Object.entries(actualUpdates)) {
              if (key === 'preferences' && value && typeof value === 'object') {
                // Check preferences are merged correctly
                expect(result.preferences).toEqual({
                  ...(existingProfile.preferences || {}),
                  ...value,
                })
              } else {
                expect((result as any)[key]).toEqual(value)
              }
            }

            // Property: Unchanged fields must remain the same
            const unchangedFields = Object.keys(existingProfile).filter(
              key => !Object.keys(actualUpdates).includes(key)
            )
            for (const field of unchangedFields) {
              if (field !== 'preferences') {
                expect((result as any)[field]).toEqual((existingProfile as any)[field])
              }
            }

            // Property: Activity logging must record the update
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              userId,
              action: 'profile_updated',
              resource: 'user_profile',
              metadata: {
                profileId: existingProfile.id,
                updatedFields: Object.keys(actualUpdates),
              },
            })

            // Property: Save must be called with merged data
            expect(mockUserProfileRepository.save).toHaveBeenCalledWith(
              expect.objectContaining(actualUpdates)
            )
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject unauthorized profile updates for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          userIdGen,
          updateProfileDtoGen,
          async (profileOwnerId, requestingUserId, updateDto) => {
            fc.pre(profileOwnerId !== requestingUserId) // Ensure different users

            // Property: Authorization must be enforced for all update attempts
            await expect(
              service.updateProfile(profileOwnerId, updateDto, requestingUserId)
            ).rejects.toThrow(ForbiddenException)

            // Property: No database operations should occur for unauthorized requests
            expect(mockUserProfileRepository.findOne).not.toHaveBeenCalled()
            expect(mockUserProfileRepository.save).not.toHaveBeenCalled()
            expect(mockActivityLogService.logActivity).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should handle non-existent profiles consistently', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, updateProfileDtoGen, async (userId, updateDto) => {
          mockUserProfileRepository.findOne.mockResolvedValue(null)

          // Property: Non-existent profile updates must fail consistently
          await expect(service.updateProfile(userId, updateDto, userId)).rejects.toThrow(
            NotFoundException
          )

          // Property: No save operations should occur for non-existent profiles
          expect(mockUserProfileRepository.save).not.toHaveBeenCalled()
          expect(mockActivityLogService.logActivity).not.toHaveBeenCalled()
        }),
        { numRuns: 20 }
      )
    })

    it('should preserve data integrity during partial updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          userProfileGen,
          fc.record(
            {
              firstName: fc.option(nameGen, { nil: undefined }),
              preferences: fc.option(
                fc.record(
                  {
                    emailNotifications: fc.option(fc.boolean(), { nil: undefined }),
                    currency: fc.option(currencyGen, { nil: undefined }),
                  },
                  { requiredKeys: [] }
                ),
                { nil: undefined }
              ),
            },
            { requiredKeys: [] }
          ),
          async (userId, existingProfile, partialUpdate) => {
            const hasUpdates = Object.values(partialUpdate).some(v => v !== undefined)
            fc.pre(hasUpdates)

            mockUserProfileRepository.findOne.mockResolvedValue(existingProfile)

            const expectedProfile = { ...existingProfile }
            if (partialUpdate.firstName !== undefined) {
              expectedProfile.firstName = partialUpdate.firstName
            }
            if (partialUpdate.preferences !== undefined) {
              expectedProfile.preferences = {
                ...existingProfile.preferences,
                ...partialUpdate.preferences,
              }
            }

            mockUserProfileRepository.save.mockResolvedValue(expectedProfile)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const result = await service.updateProfile(userId, partialUpdate, userId)

            // Property: Partial updates must not corrupt existing data
            expect(result.lastName).toBe(existingProfile.lastName) // Unchanged
            expect(result.phone).toBe(existingProfile.phone) // Unchanged
            expect(result.location).toEqual(existingProfile.location) // Unchanged

            // Property: Preferences must be merged, not replaced
            if (partialUpdate.preferences) {
              expect(result.preferences.smsNotifications).toBe(
                existingProfile.preferences.smsNotifications
              )
              expect(result.preferences.pushNotifications).toBe(
                existingProfile.preferences.pushNotifications
              )
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property 43: GDPR Veri Silme**
   *
   * **Validates: Requirements 14.5**
   *
   * For any user account, when account deletion is requested by the account owner,
   * the system must completely remove all personal data and associated resources
   * in compliance with GDPR requirements.
   */
  describe('Property 43: GDPR Data Deletion', () => {
    it('should completely delete all user data for any valid deletion request', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.record({
            id: userIdGen,
            email: fc.emailAddress(),
            role: fc.constantFrom(...Object.values(UserRole)),
            profile: fc.option(userProfileGen, { nil: null }),
            professionalProfile: fc.option(fc.record({ id: userIdGen }), { nil: null }),
            supplierProfile: fc.option(fc.record({ id: userIdGen }), { nil: null }),
          }),
          async (userId, userData) => {
            const userWithRelations = { ...userData, id: userId }
            mockUserRepository.findOne.mockResolvedValue(userWithRelations)
            mockUserRepository.remove.mockResolvedValue(userWithRelations)
            mockS3Service.deleteProfilePhoto.mockResolvedValue(undefined)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const result = await service.deleteAccount(userId, userId)

            // Property: Deletion must be confirmed
            expect(result).toEqual({ message: 'Account deleted successfully' })

            // Property: User data must be fetched with all relations for complete deletion
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
              where: { id: userId },
              relations: ['profile', 'professionalProfile', 'supplierProfile'],
            })

            // Property: Activity must be logged before deletion
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              userId,
              action: 'account_deletion_requested',
              resource: 'user',
              metadata: {
                email: userWithRelations.email,
                role: userWithRelations.role,
              },
            })

            // Property: User entity must be removed (cascade handles relations)
            expect(mockUserRepository.remove).toHaveBeenCalledWith(userWithRelations)

            // Property: Profile photo must be deleted from S3 if exists
            if (userWithRelations.profile?.avatarUrl) {
              expect(mockS3Service.deleteProfilePhoto).toHaveBeenCalledWith(userId)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject unauthorized deletion requests for any user', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, userIdGen, async (targetUserId, requestingUserId) => {
          fc.pre(targetUserId !== requestingUserId) // Ensure different users

          // Property: Authorization must be enforced for all deletion requests
          await expect(service.deleteAccount(targetUserId, requestingUserId)).rejects.toThrow(
            ForbiddenException
          )

          // Property: No database operations should occur for unauthorized requests
          expect(mockUserRepository.findOne).not.toHaveBeenCalled()
          expect(mockUserRepository.remove).not.toHaveBeenCalled()
          expect(mockS3Service.deleteProfilePhoto).not.toHaveBeenCalled()
          expect(mockActivityLogService.logActivity).not.toHaveBeenCalled()
        }),
        { numRuns: 30 }
      )
    })

    it('should handle non-existent users consistently', async () => {
      await fc.assert(
        fc.asyncProperty(userIdGen, async userId => {
          mockUserRepository.findOne.mockResolvedValue(null)

          // Property: Non-existent user deletion must fail consistently
          await expect(service.deleteAccount(userId, userId)).rejects.toThrow(NotFoundException)

          // Property: No deletion operations should occur for non-existent users
          expect(mockUserRepository.remove).not.toHaveBeenCalled()
          expect(mockS3Service.deleteProfilePhoto).not.toHaveBeenCalled()
        }),
        { numRuns: 20 }
      )
    })

    it('should handle S3 deletion failures gracefully without blocking account deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.record({
            id: userIdGen,
            email: fc.emailAddress(),
            role: fc.constantFrom(...Object.values(UserRole)),
            profile: fc.record({
              avatarUrl: fc.webUrl(),
            }),
          }),
          async (userId, userData) => {
            const userWithAvatar = { ...userData, id: userId }
            mockUserRepository.findOne.mockResolvedValue(userWithAvatar)
            mockUserRepository.remove.mockResolvedValue(userWithAvatar)
            mockS3Service.deleteProfilePhoto.mockRejectedValue(new Error('S3 deletion failed'))
            mockActivityLogService.logActivity.mockResolvedValue({})

            // Spy on console.error to verify error logging
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

            const result = await service.deleteAccount(userId, userId)

            // Property: Account deletion must succeed even if S3 deletion fails
            expect(result).toEqual({ message: 'Account deleted successfully' })
            expect(mockUserRepository.remove).toHaveBeenCalledWith(userWithAvatar)

            // Property: S3 deletion failure must be logged but not block deletion
            expect(consoleSpy).toHaveBeenCalledWith(
              'Failed to delete profile photo from S3:',
              expect.any(Error)
            )

            consoleSpy.mockRestore()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should export complete user data for GDPR compliance before deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          fc.record({
            id: userIdGen,
            email: fc.emailAddress(),
            passwordHash: fc.string(),
            twoFactorSecret: fc.option(fc.string(), { nil: null }),
            role: fc.constantFrom(...Object.values(UserRole)),
            profile: fc.option(userProfileGen, { nil: null }),
            professionalProfile: fc.option(fc.record({ id: userIdGen }), { nil: null }),
            supplierProfile: fc.option(fc.record({ id: userIdGen }), { nil: null }),
            bookings: fc.array(fc.record({ id: userIdGen })),
            orders: fc.array(fc.record({ id: userIdGen })),
            serviceRatings: fc.array(fc.record({ id: userIdGen })),
            productReviews: fc.array(fc.record({ id: userIdGen })),
            supplierReviews: fc.array(fc.record({ id: userIdGen })),
          }),
          async (userId, userData) => {
            const userWithAllData = { ...userData, id: userId }
            mockUserRepository.findOne.mockResolvedValue(userWithAllData)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const result = await service.exportUserData(userId, userId)

            // Property: Export must include timestamp
            expect(result).toHaveProperty('exportDate')
            expect(new Date(result.exportDate)).toBeInstanceOf(Date)

            // Property: Export must include all user data
            expect(result).toHaveProperty('userData')
            expect(result.userData.id).toBe(userId)
            expect(result.userData.email).toBe(userWithAllData.email)
            expect(result.userData.role).toBe(userWithAllData.role)

            // Property: Sensitive data must be excluded from export
            expect(result.userData).not.toHaveProperty('passwordHash')
            expect(result.userData).not.toHaveProperty('twoFactorSecret')

            // Property: All relations must be included
            expect(result.userData.profile).toEqual(userWithAllData.profile)
            expect(result.userData.professionalProfile).toEqual(userWithAllData.professionalProfile)
            expect(result.userData.supplierProfile).toEqual(userWithAllData.supplierProfile)
            expect(result.userData.bookings).toEqual(userWithAllData.bookings)
            expect(result.userData.orders).toEqual(userWithAllData.orders)
            expect(result.userData.serviceRatings).toEqual(userWithAllData.serviceRatings)
            expect(result.userData.productReviews).toEqual(userWithAllData.productReviews)
            expect(result.userData.supplierReviews).toEqual(userWithAllData.supplierReviews)

            // Property: Data export must be logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              userId,
              action: 'data_export_requested',
              resource: 'user',
              metadata: { email: userWithAllData.email },
            })

            // Property: User must be fetched with all relations
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
              where: { id: userId },
              relations: [
                'profile',
                'professionalProfile',
                'supplierProfile',
                'bookings',
                'orders',
                'serviceRatings',
                'productReviews',
                'supplierReviews',
              ],
            })
          }
        ),
        { numRuns: 30 }
      )
    })
  })

  /**
   * **Property: Profile Photo Upload Consistency**
   *
   * For any valid image file, when profile photo upload is performed,
   * the system must update the profile with the new photo URL and
   * maintain data consistency.
   */
  describe('Property: Profile Photo Upload Consistency', () => {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    const validFileGen = fc.record({
      mimetype: fc.constantFrom(...validMimeTypes),
      size: fc.integer({ min: 1, max: 5 * 1024 * 1024 }), // 1 byte to 5MB
      buffer: fc.uint8Array({ minLength: 1, maxLength: 100 }),
    })

    it('should consistently update profile with new photo URL for any valid file', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          userProfileGen,
          validFileGen,
          async (userId, existingProfile, file) => {
            const mockFile = file as Express.Multer.File
            const newAvatarUrl = `https://s3.amazonaws.com/bucket/profile-photos/${userId}/photo.jpg`

            mockUserProfileRepository.findOne.mockResolvedValue(existingProfile)
            mockS3Service.uploadProfilePhoto.mockResolvedValue(newAvatarUrl)

            const updatedProfile = { ...existingProfile, avatarUrl: newAvatarUrl }
            mockUserProfileRepository.save.mockResolvedValue(updatedProfile)
            mockActivityLogService.logActivity.mockResolvedValue({})

            const result = await service.uploadProfilePhoto(userId, mockFile, userId)

            // Property: Upload result must contain the new avatar URL
            expect(result).toEqual({ avatarUrl: newAvatarUrl })

            // Property: S3 service must be called with correct parameters
            expect(mockS3Service.uploadProfilePhoto).toHaveBeenCalledWith(userId, mockFile)

            // Property: Profile must be updated with new avatar URL
            expect(mockUserProfileRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({ avatarUrl: newAvatarUrl })
            )

            // Property: Activity must be logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
              userId,
              action: 'profile_photo_uploaded',
              resource: 'user_profile',
              metadata: {
                profileId: existingProfile.id,
                avatarUrl: newAvatarUrl,
              },
            })
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should reject invalid file types consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          userProfileGen,
          fc.record({
            mimetype: fc.string().filter(mime => !validMimeTypes.includes(mime)),
            size: fc.integer({ min: 1, max: 1024 * 1024 }),
            buffer: fc.uint8Array({ minLength: 1, maxLength: 100 }),
          }),
          async (userId, existingProfile, file) => {
            const mockFile = file as Express.Multer.File
            mockUserProfileRepository.findOne.mockResolvedValue(existingProfile)

            // Property: Invalid file types must be rejected
            await expect(service.uploadProfilePhoto(userId, mockFile, userId)).rejects.toThrow(
              BadRequestException
            )

            // Property: No S3 operations should occur for invalid files
            expect(mockS3Service.uploadProfilePhoto).not.toHaveBeenCalled()
            expect(mockUserProfileRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should reject files that are too large', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdGen,
          userProfileGen,
          fc.record({
            mimetype: fc.constantFrom(...validMimeTypes),
            size: fc.integer({ min: 5 * 1024 * 1024 + 1, max: 10 * 1024 * 1024 }), // > 5MB
            buffer: fc.uint8Array({ minLength: 1, maxLength: 100 }),
          }),
          async (userId, existingProfile, file) => {
            const mockFile = file as Express.Multer.File
            mockUserProfileRepository.findOne.mockResolvedValue(existingProfile)

            // Property: Files exceeding size limit must be rejected
            await expect(service.uploadProfilePhoto(userId, mockFile, userId)).rejects.toThrow(
              BadRequestException
            )

            // Property: No S3 operations should occur for oversized files
            expect(mockS3Service.uploadProfilePhoto).not.toHaveBeenCalled()
            expect(mockUserProfileRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 20 }
      )
    })
  })
})
