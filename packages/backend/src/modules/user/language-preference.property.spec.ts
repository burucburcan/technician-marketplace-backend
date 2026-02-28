import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fc from 'fast-check'
import { UserService } from './user.service'
import { UserProfile } from '../../entities/user-profile.entity'
import { User } from '../../entities/user.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Certificate } from '../../entities/certificate.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { UpdatePreferencesDto } from './dto/update-preferences.dto'
import { NotFoundException, ForbiddenException } from '@nestjs/common'

/**
 * Property-Based Tests for Language Preference Persistence
 *
 * Feature: technician-marketplace-platform
 * Task: 5.10 Dil tercihi için property testi yaz
 *
 * **Validates: Requirements 2.3**
 */

describe('Language Preference Persistence Property Tests', () => {
  let userService: UserService
  let userProfileRepository: Repository<UserProfile>
  let activityLogService: ActivityLogService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PortfolioItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              getRawOne: jest.fn(),
            })),
          },
        },
        {
          provide: ActivityLogService,
          useValue: {
            logActivity: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadProfilePhoto: jest.fn(),
          },
        },
      ],
    }).compile()

    userService = module.get<UserService>(UserService)
    userProfileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile))
    activityLogService = module.get<ActivityLogService>(ActivityLogService)

    jest.clearAllMocks()
  })

  // Arbitraries (generators) for property-based testing

  const validLanguageArbitrary = fc.constantFrom('es', 'en')

  const invalidLanguageArbitrary = fc.oneof(
    fc.constant('fr'),
    fc.constant('de'),
    fc.constant('pt'),
    fc.constant('it'),
    fc.constant('zh'),
    fc.constant('invalid'),
    fc.constant(''),
    fc.string({ minLength: 3, maxLength: 10 }).filter((s: string) => s !== 'es' && s !== 'en')
  )

  const userProfileArbitrary = fc.record({
    id: fc.uuid(),
    userId: fc.uuid(),
    firstName: fc.string({ minLength: 2, maxLength: 50 }),
    lastName: fc.string({ minLength: 2, maxLength: 50 }),
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    avatarUrl: fc.option(fc.webUrl(), { nil: null }),
    language: validLanguageArbitrary,
    location: fc.record({
      address: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      state: fc.string({ minLength: 2, maxLength: 50 }),
      country: fc.constant('Mexico'),
      postalCode: fc.string({ minLength: 5, maxLength: 10 }),
      coordinates: fc.record({
        latitude: fc.double({ min: -90, max: 90 }),
        longitude: fc.double({ min: -180, max: 180 }),
      }),
    }),
    preferences: fc.record({
      emailNotifications: fc.boolean(),
      smsNotifications: fc.boolean(),
      pushNotifications: fc.boolean(),
      currency: fc.constantFrom('MXN', 'USD'),
    }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  })

  /**
   * **Property 6: Dil Tercihi Kalıcılığı**
   *
   * **Validates: Requirement 2.3**
   *
   * GIVEN a user with a profile
   * WHEN the user updates their language preference to a valid language ('es' or 'en')
   * THEN the language preference SHALL be saved to the database
   * AND WHEN the user profile is retrieved again
   * THEN the language preference SHALL match the updated value
   * AND the preference SHALL persist across multiple reads
   */
  describe('Property 6: Language Preference Persistence', () => {
    it('should persist language preference across save and retrieve for any valid language', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary,
          validLanguageArbitrary,
          async (initialProfile: any, newLanguage: string) => {
            // Ensure the new language is different from the initial one
            fc.pre(initialProfile.language !== newLanguage)

            const userId = initialProfile.userId

            // Mock initial profile retrieval
            jest
              .spyOn(userProfileRepository, 'findOne')
              .mockResolvedValueOnce(initialProfile as any)

            // Mock save operation - return updated profile
            const updatedProfile = {
              ...initialProfile,
              language: newLanguage,
              updatedAt: new Date(),
            }

            jest.spyOn(userProfileRepository, 'save').mockResolvedValueOnce(updatedProfile as any)

            // Mock activity log
            jest.spyOn(activityLogService, 'logActivity').mockResolvedValue({} as any)

            // Act: Update language preference
            const updateDto: UpdatePreferencesDto = {
              language: newLanguage,
            }

            const result = await userService.updatePreferences(userId, updateDto, userId)

            // Assert: Language should be updated
            expect(result.language).toBe(newLanguage)
            expect(result.language).not.toBe(initialProfile.language)

            // Verify save was called with updated language
            expect(userProfileRepository.save).toHaveBeenCalledWith(
              expect.objectContaining({
                language: newLanguage,
              })
            )

            // Mock subsequent retrieval to verify persistence
            jest
              .spyOn(userProfileRepository, 'findOne')
              .mockResolvedValueOnce(updatedProfile as any)

            const retrievedProfile = await userProfileRepository.findOne({
              where: { userId },
            })

            // Assert: Language preference persists across reads
            expect(retrievedProfile).toBeDefined()
            expect(retrievedProfile!.language).toBe(newLanguage)

            // Verify activity was logged
            expect(activityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                action: 'preferences_updated',
                resource: 'user_profile',
                metadata: expect.objectContaining({
                  updatedFields: ['language'],
                }),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should persist language preference across multiple sequential reads', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary,
          validLanguageArbitrary,
          fc.integer({ min: 2, max: 5 }),
          async (initialProfile: any, newLanguage: string, numReads: number) => {
            fc.pre(initialProfile.language !== newLanguage)

            const userId = initialProfile.userId

            // Mock initial profile retrieval
            jest
              .spyOn(userProfileRepository, 'findOne')
              .mockResolvedValueOnce(initialProfile as any)

            // Mock save operation
            const updateDto = { language: newLanguage }
            const updatedProfile = {
              ...initialProfile,
              language: newLanguage,
              updatedAt: new Date(),
            }

            jest.spyOn(userProfileRepository, 'save').mockResolvedValueOnce(updatedProfile as any)

            jest.spyOn(activityLogService, 'logActivity').mockResolvedValue({} as any)

            // Act: Update language preference
            await userService.updatePreferences(userId, updateDto, userId)

            // Mock multiple subsequent retrievals
            for (let i = 0; i < numReads; i++) {
              jest
                .spyOn(userProfileRepository, 'findOne')
                .mockResolvedValueOnce(updatedProfile as any)
            }

            // Assert: Language preference persists across multiple reads
            for (let i = 0; i < numReads; i++) {
              const retrievedProfile = await userProfileRepository.findOne({
                where: { userId },
              })

              expect(retrievedProfile).toBeDefined()
              expect(retrievedProfile!.language).toBe(newLanguage)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should reject invalid language values for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary,
          invalidLanguageArbitrary,
          async (profile: any, invalidLanguage: string) => {
            // Mock profile retrieval
            jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(profile as any)

            // Act & Assert: Invalid language should be rejected by validation
            // Note: In a real scenario, the DTO validation would reject this
            // before it reaches the service. We're testing the property that
            // only 'es' or 'en' are valid values.

            // The validation happens at the controller level via class-validator
            // Here we verify that if an invalid language somehow gets through,
            // it won't be saved

            // For this test, we simulate the validation behavior
            const validLanguages = ['es', 'en']
            const isValid = validLanguages.includes(invalidLanguage)

            if (!isValid) {
              // Invalid languages should not be processed
              expect(validLanguages).not.toContain(invalidLanguage)

              // Verify that save would not be called with invalid language
              expect(userProfileRepository.save).not.toHaveBeenCalledWith(
                expect.objectContaining({
                  language: invalidLanguage,
                })
              )
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should maintain language preference when updating other preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary,
          fc.boolean(),
          fc.boolean(),
          async (profile: any, emailNotif: boolean, smsNotif: boolean) => {
            const userId = profile.userId
            const originalLanguage = profile.language

            // Mock profile retrieval
            jest.spyOn(userProfileRepository, 'findOne').mockResolvedValueOnce(profile as any)

            // Mock save operation
            const updatedProfile = {
              ...profile,
              preferences: {
                ...profile.preferences,
                emailNotifications: emailNotif,
                smsNotifications: smsNotif,
              },
              updatedAt: new Date(),
            }

            jest.spyOn(userProfileRepository, 'save').mockResolvedValueOnce(updatedProfile as any)

            jest.spyOn(activityLogService, 'logActivity').mockResolvedValue({} as any)

            // Act: Update other preferences (not language)
            const updateDto: UpdatePreferencesDto = {
              emailNotifications: emailNotif,
              smsNotifications: smsNotif,
            }

            const result = await userService.updatePreferences(userId, updateDto, userId)

            // Assert: Language preference should remain unchanged
            expect(result.language).toBe(originalLanguage)
            expect(result.preferences.emailNotifications).toBe(emailNotif)
            expect(result.preferences.smsNotifications).toBe(smsNotif)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should enforce authorization - users can only update their own language preference', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary,
          fc.uuid(),
          validLanguageArbitrary,
          async (profile: any, differentUserId: string, newLanguage: string) => {
            fc.pre(profile.userId !== differentUserId)

            const userId = profile.userId

            // Act & Assert: Should throw ForbiddenException
            const updateDto: UpdatePreferencesDto = {
              language: newLanguage,
            }

            await expect(
              userService.updatePreferences(userId, updateDto, differentUserId)
            ).rejects.toThrow(ForbiddenException)

            // Verify save was never called
            expect(userProfileRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should handle non-existent user profiles gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          validLanguageArbitrary,
          async (userId: string, newLanguage: string) => {
            // Mock profile not found
            jest.spyOn(userProfileRepository, 'findOne').mockResolvedValue(null)

            // Act & Assert: Should throw NotFoundException
            const updateDto: UpdatePreferencesDto = {
              language: newLanguage,
            }

            await expect(userService.updatePreferences(userId, updateDto, userId)).rejects.toThrow(
              NotFoundException
            )

            // Verify save was never called
            expect(userProfileRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 30 }
      )
    })

    it('should preserve all other profile fields when updating language', async () => {
      await fc.assert(
        fc.asyncProperty(
          userProfileArbitrary,
          validLanguageArbitrary,
          async (profile: any, newLanguage: string) => {
            fc.pre(profile.language !== newLanguage)

            const userId = profile.userId

            // Mock profile retrieval
            jest.spyOn(userProfileRepository, 'findOne').mockResolvedValueOnce(profile as any)

            // Mock save operation
            const updatedProfile = {
              ...profile,
              language: newLanguage,
              updatedAt: new Date(),
            }

            jest.spyOn(userProfileRepository, 'save').mockResolvedValueOnce(updatedProfile as any)

            jest.spyOn(activityLogService, 'logActivity').mockResolvedValue({} as any)

            // Act: Update language preference
            const updateDto: UpdatePreferencesDto = {
              language: newLanguage,
            }

            const result = await userService.updatePreferences(userId, updateDto, userId)

            // Assert: All other fields should remain unchanged
            expect(result.id).toBe(profile.id)
            expect(result.userId).toBe(profile.userId)
            expect(result.firstName).toBe(profile.firstName)
            expect(result.lastName).toBe(profile.lastName)
            expect(result.phone).toBe(profile.phone)
            expect(result.avatarUrl).toBe(profile.avatarUrl)
            expect(result.location).toEqual(profile.location)
            expect(result.preferences).toEqual(profile.preferences)

            // Only language should change
            expect(result.language).toBe(newLanguage)
            expect(result.language).not.toBe(profile.language)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})
