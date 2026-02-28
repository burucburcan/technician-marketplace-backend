import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fc from 'fast-check'
import { UserService } from './user.service'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalType, VerificationStatus } from '../../common/enums'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { BadRequestException } from '@nestjs/common'

/**
 * Property-Based Tests for Professional Profile Management
 *
 * Feature: technician-marketplace-platform
 * Task: 5.4 Profesyonel profili için property testleri yaz
 */

describe('Professional Profile Property Tests', () => {
  let userService: UserService
  let professionalRepository: Repository<ProfessionalProfile>
  let serviceCategoryRepository: Repository<ServiceCategory>
  let userRepository: Repository<User>
  let userProfileRepository: Repository<UserProfile>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
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
          provide: ActivityLogService,
          useValue: {
            logActivity: jest.fn(),
          },
        },
        {
          provide: S3Service,
          useValue: {
            uploadProfilePhoto: jest.fn(),
            deleteProfilePhoto: jest.fn(),
          },
        },
      ],
    }).compile()

    userService = module.get<UserService>(UserService)
    professionalRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    serviceCategoryRepository = module.get<Repository<ServiceCategory>>(
      getRepositoryToken(ServiceCategory)
    )
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    userProfileRepository = module.get<Repository<UserProfile>>(getRepositoryToken(UserProfile))
  })

  // Arbitraries (generators) for property-based testing

  const workingHoursArbitrary = fc.record({
    monday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
    tuesday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
    wednesday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
    thursday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
    friday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
    saturday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
    sunday: fc.array(
      fc.record({
        start: fc.constantFrom('08:00', '09:00', '10:00'),
        end: fc.constantFrom('17:00', '18:00', '19:00'),
      }),
      { minLength: 0, maxLength: 2 }
    ),
  })

  const coordinatesArbitrary = fc.record({
    latitude: fc.double({ min: -90, max: 90 }),
    longitude: fc.double({ min: -180, max: 180 }),
  })

  const createProfessionalProfileDtoArbitrary = fc.record({
    professionalType: fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST),
    businessName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: null,
    }),
    experienceYears: fc.integer({ min: 0, max: 50 }),
    hourlyRate: fc.double({ min: 10, max: 500 }),
    serviceRadius: fc.integer({ min: 5, max: 100 }),
    workingHours: workingHoursArbitrary,
    currentLocation: fc.option(coordinatesArbitrary, { nil: null }),
    artStyle: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        minLength: 1,
        maxLength: 5,
      }),
      { nil: null }
    ),
    materials: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        minLength: 1,
        maxLength: 5,
      }),
      { nil: null }
    ),
    techniques: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        minLength: 1,
        maxLength: 5,
      }),
      { nil: null }
    ),
    specializationIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
  })

  /**
   * Property 7: Profesyonel Profil Round-Trip
   *
   * **Validates: Requirements 3.1, 3.2, 3.5**
   *
   * For any valid professional profile data (handyman or artist),
   * when the profile is created and saved, all fields (name, surname, type,
   * specialization, experience, contact, work area) should contain
   * the same values when read back.
   */
  it('Property 7: Professional Profile Round-Trip', async () => {
    await fc.assert(
      fc.asyncProperty(createProfessionalProfileDtoArbitrary, async (profileDto: any) => {
        // Arrange: Create mock user
        const mockUserId = fc.sample(fc.uuid(), 1)[0]
        const mockUser = {
          id: mockUserId,
          email: 'test@example.com',
          role: 'user',
        }

        jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

        // Mock no existing professional profile
        jest.spyOn(professionalRepository, 'findOne').mockResolvedValueOnce(null)

        // Mock valid service categories
        const mockCategories = profileDto.specializationIds.map((id: string) => ({
          id,
          name: `Category ${id}`,
          isActive: true,
        }))

        jest.spyOn(serviceCategoryRepository, 'find').mockResolvedValue(mockCategories as any)

        // Create the professional profile entity
        const createdProfile = {
          id: fc.sample(fc.uuid(), 1)[0],
          userId: mockUserId,
          professionalType: profileDto.professionalType,
          businessName: profileDto.businessName,
          experienceYears: profileDto.experienceYears,
          hourlyRate: profileDto.hourlyRate,
          serviceRadius: profileDto.serviceRadius,
          workingHours: profileDto.workingHours,
          verificationStatus: VerificationStatus.PENDING,
          isAvailable: true,
          currentLocation: profileDto.currentLocation,
          rating: 0,
          totalJobs: 0,
          completionRate: 0,
          artStyle: profileDto.artStyle,
          materials: profileDto.materials,
          techniques: profileDto.techniques,
          specializations: mockCategories,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        jest.spyOn(professionalRepository, 'create').mockReturnValue(createdProfile as any)

        jest.spyOn(professionalRepository, 'save').mockResolvedValue(createdProfile as any)

        // Act: Create professional profile
        const result = await userService.createProfessionalProfile(mockUserId, profileDto)

        // Mock findOne to return the saved profile for retrieval
        jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(createdProfile as any)

        // Read back the profile
        const retrievedProfile = await userService.getProfessionalProfile(result.id)

        // Assert: All fields should match (Round-Trip validation)
        expect(retrievedProfile).toBeDefined()
        expect(retrievedProfile.professionalType).toBe(profileDto.professionalType)
        expect(retrievedProfile.businessName).toBe(profileDto.businessName)
        expect(retrievedProfile.experienceYears).toBe(profileDto.experienceYears)
        expect(retrievedProfile.hourlyRate).toBe(profileDto.hourlyRate)
        expect(retrievedProfile.serviceRadius).toBe(profileDto.serviceRadius)
        expect(retrievedProfile.workingHours).toEqual(profileDto.workingHours)
        expect(retrievedProfile.currentLocation).toEqual(profileDto.currentLocation)
        expect(retrievedProfile.artStyle).toEqual(profileDto.artStyle)
        expect(retrievedProfile.materials).toEqual(profileDto.materials)
        expect(retrievedProfile.techniques).toEqual(profileDto.techniques)

        // Verify specializations (service categories) are preserved
        expect(retrievedProfile.specializations).toBeDefined()
        expect(retrievedProfile.specializations.length).toBe(profileDto.specializationIds.length)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8: Geçersiz Kategori Reddi
   *
   * **Validates: Requirements 3.3**
   *
   * For any invalid service category, when attempting to add it to a
   * professional profile, the system should return an error and reject
   * the addition.
   */
  it('Property 8: Invalid Category Rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          professionalType: fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST),
          experienceYears: fc.integer({ min: 0, max: 50 }),
          hourlyRate: fc.double({ min: 10, max: 500 }),
          serviceRadius: fc.integer({ min: 5, max: 100 }),
          workingHours: workingHoursArbitrary,
          // Generate invalid category IDs (UUIDs that don't exist)
          invalidCategoryIds: fc.array(fc.uuid(), {
            minLength: 1,
            maxLength: 3,
          }),
        }),
        async (testData: any) => {
          // Arrange: Create mock user
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          const mockUser = {
            id: mockUserId,
            email: 'test@example.com',
            role: 'user',
          }

          jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

          // Mock no existing professional profile
          jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(null)

          // Mock service category repository to return empty array (no valid categories found)
          // This simulates invalid category IDs
          jest.spyOn(serviceCategoryRepository, 'find').mockResolvedValue([])

          const profileDto = {
            ...testData,
            specializationIds: testData.invalidCategoryIds,
          }

          // Act & Assert: Attempt to create professional profile with invalid categories
          // Should throw BadRequestException
          await expect(
            userService.createProfessionalProfile(mockUserId, profileDto)
          ).rejects.toThrow(BadRequestException)

          await expect(
            userService.createProfessionalProfile(mockUserId, profileDto)
          ).rejects.toThrow('One or more invalid service category IDs provided')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8 (Extended): Partial Invalid Category Rejection
   *
   * **Validates: Requirements 3.3**
   *
   * When some category IDs are valid and some are invalid, the system
   * should reject the entire operation (all-or-nothing validation).
   */
  it('Property 8 (Extended): Partial Invalid Category Rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          professionalType: fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST),
          experienceYears: fc.integer({ min: 0, max: 50 }),
          hourlyRate: fc.double({ min: 10, max: 500 }),
          serviceRadius: fc.integer({ min: 5, max: 100 }),
          workingHours: workingHoursArbitrary,
          validCategoryIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 2 }),
          invalidCategoryIds: fc.array(fc.uuid(), {
            minLength: 1,
            maxLength: 2,
          }),
        }),
        async (testData: any) => {
          // Arrange: Create mock user
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          const mockUser = {
            id: mockUserId,
            email: 'test@example.com',
            role: 'user',
          }

          jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

          // Mock no existing professional profile
          jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(null)

          // Mock service category repository to return only valid categories
          const mockValidCategories = testData.validCategoryIds.map((id: string) => ({
            id,
            name: `Category ${id}`,
            isActive: true,
          }))

          jest
            .spyOn(serviceCategoryRepository, 'find')
            .mockResolvedValue(mockValidCategories as any)

          // Combine valid and invalid category IDs
          const allCategoryIds = [...testData.validCategoryIds, ...testData.invalidCategoryIds]

          const profileDto = {
            ...testData,
            specializationIds: allCategoryIds,
          }

          // Act & Assert: Should reject because not all categories are valid
          // The service validates that the number of found categories matches
          // the number of requested categories
          await expect(
            userService.createProfessionalProfile(mockUserId, profileDto)
          ).rejects.toThrow(BadRequestException)

          await expect(
            userService.createProfessionalProfile(mockUserId, profileDto)
          ).rejects.toThrow('One or more invalid service category IDs provided')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 8 (Edge Case): Inactive Category Rejection
   *
   * **Validates: Requirements 3.3**
   *
   * When attempting to add an inactive service category to a professional
   * profile, the system should reject it (only active categories are allowed).
   */
  it('Property 8 (Edge Case): Inactive Category Rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          professionalType: fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST),
          experienceYears: fc.integer({ min: 0, max: 50 }),
          hourlyRate: fc.double({ min: 10, max: 500 }),
          serviceRadius: fc.integer({ min: 5, max: 100 }),
          workingHours: workingHoursArbitrary,
          inactiveCategoryIds: fc.array(fc.uuid(), {
            minLength: 1,
            maxLength: 3,
          }),
        }),
        async (testData: any) => {
          // Arrange: Create mock user
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          const mockUser = {
            id: mockUserId,
            email: 'test@example.com',
            role: 'user',
          }

          jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

          // Mock no existing professional profile
          jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(null)

          // Mock service category repository to return empty array
          // (inactive categories are filtered out by the query)
          jest.spyOn(serviceCategoryRepository, 'find').mockResolvedValue([])

          const profileDto = {
            ...testData,
            specializationIds: testData.inactiveCategoryIds,
          }

          // Act & Assert: Should reject because categories are inactive
          await expect(
            userService.createProfessionalProfile(mockUserId, profileDto)
          ).rejects.toThrow(BadRequestException)

          await expect(
            userService.createProfessionalProfile(mockUserId, profileDto)
          ).rejects.toThrow('One or more invalid service category IDs provided')
        }
      ),
      { numRuns: 100 }
    )
  })
})
