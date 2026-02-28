import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import * as fc from 'fast-check'
import { ProviderService } from './provider.service'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { User } from '../../entities/user.entity'
import { Booking } from '../../entities/booking.entity'
import { ServiceRating } from '../../entities/service-rating.entity'
import { CreateProfessionalDto } from './dto'
import { UserRole, BookingStatus, ProfessionalType } from '../../common/enums'
import { ActivityLogService } from '../activity-log/activity-log.service'

/**
 * Property-Based Tests for Provider Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the provider management system, ensuring correctness at scale.
 */
describe('ProviderService Property Tests', () => {
  let service: ProviderService

  const mockProfessionalRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockServiceCategoryRepository = {
    find: jest.fn(),
  }

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockBookingRepository = {
    find: jest.fn(),
  }

  const mockServiceRatingRepository = {
    find: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalRepository,
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: mockServiceCategoryRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(ServiceRating),
          useValue: mockServiceRatingRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile()

    service = module.get<ProviderService>(ProviderService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const professionalTypeGen = fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST)
  const businessNameGen = fc.string({ minLength: 3, maxLength: 100 })
  const experienceYearsGen = fc.integer({ min: 0, max: 50 })
  const hourlyRateGen = fc.integer({ min: 10, max: 500 })
  const serviceRadiusGen = fc.integer({ min: 5, max: 100 })

  /**
   * **Property 28: Provider Profesyonel İlişkisi (Provider Professional Relationship)**
   *
   * **Validates: Requirements 8.1**
   *
   * For any provider, when querying professionals, the returned list must only contain
   * professionals added by that provider. This ensures data isolation and proper
   * provider-professional relationships.
   */
  describe('Property 28: Provider Professional Relationship', () => {
    it('should return only professionals belonging to the provider for any provider ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.array(
            fc.record({
              id: uuidGen,
              userId: uuidGen,
              professionalType: professionalTypeGen,
              businessName: businessNameGen,
              experienceYears: experienceYearsGen,
              hourlyRate: hourlyRateGen,
              serviceRadius: serviceRadiusGen,
              isAvailable: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (providerId: string, professionals: any[]) => {
            // Setup mock provider
            const mockProvider = {
              id: providerId,
              email: `provider_${providerId}@test.com`,
              role: UserRole.PROVIDER,
              isEmailVerified: true,
            }

            // Setup mock professionals all belonging to this provider
            const mockProfessionals = professionals.map(p => ({
              ...p,
              providerId,
              rating: 0,
              totalJobs: 0,
              completionRate: 0,
              workingHours: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: [],
              },
              verificationStatus: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            }))

            mockUserRepository.findOne.mockResolvedValue(mockProvider)

            // Mock query builder
            const mockQueryBuilder = {
              createQueryBuilder: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(mockProfessionals),
            }

            mockProfessionalRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const result = await service.getProfessionals(providerId)

            // Property: All returned professionals must belong to the provider
            expect(result).toHaveLength(mockProfessionals.length)
            result.forEach(professional => {
              expect(professional.providerId).toBe(providerId)
            })

            // Verify query was filtered by providerId
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
              'professional.providerId = :providerId',
              { providerId }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter professionals by type while maintaining provider relationship', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          professionalTypeGen,
          fc.array(
            fc.record({
              id: uuidGen,
              userId: uuidGen,
              professionalType: professionalTypeGen,
              businessName: businessNameGen,
              experienceYears: experienceYearsGen,
            }),
            { minLength: 2, maxLength: 15 }
          ),
          async (providerId: string, filterType: ProfessionalType, professionals: any[]) => {
            // Ensure we have at least one professional of the filter type
            const hasFilterType = professionals.some(p => p.professionalType === filterType)
            fc.pre(hasFilterType)

            // Setup mock provider
            const mockProvider = {
              id: providerId,
              email: `provider_${providerId}@test.com`,
              role: UserRole.PROVIDER,
              isEmailVerified: true,
            }

            // Filter professionals by type
            const filteredProfessionals = professionals
              .filter(p => p.professionalType === filterType)
              .map(p => ({
                ...p,
                providerId,
                hourlyRate: 50,
                serviceRadius: 10,
                rating: 0,
                totalJobs: 0,
                completionRate: 0,
                isAvailable: true,
                workingHours: {
                  monday: [],
                  tuesday: [],
                  wednesday: [],
                  thursday: [],
                  friday: [],
                  saturday: [],
                  sunday: [],
                },
                verificationStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
              }))

            mockUserRepository.findOne.mockResolvedValue(mockProvider)

            // Mock query builder
            const mockQueryBuilder = {
              createQueryBuilder: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue(filteredProfessionals),
            }

            mockProfessionalRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            const result = await service.getProfessionals(providerId, {
              professionalType: filterType,
            })

            // Property: All returned professionals must belong to provider AND match filter type
            expect(result.length).toBeGreaterThan(0)
            result.forEach(professional => {
              expect(professional.providerId).toBe(providerId)
              expect(professional.professionalType).toBe(filterType)
            })

            // Verify both filters were applied
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
              'professional.providerId = :providerId',
              { providerId }
            )
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
              'professional.professionalType = :professionalType',
              { professionalType: filterType }
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject access to professionals from different providers', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          async (providerId: string, otherProviderId: string, professionalId: string) => {
            // Ensure providers are different
            fc.pre(providerId !== otherProviderId)

            // Setup mock provider
            const mockProvider = {
              id: providerId,
              email: `provider_${providerId}@test.com`,
              role: UserRole.PROVIDER,
              isEmailVerified: true,
            }

            // Setup professional belonging to different provider
            const mockProfessional = {
              id: professionalId,
              userId: fc.sample(uuidGen, 1)[0],
              providerId: otherProviderId, // Different provider!
              professionalType: ProfessionalType.HANDYMAN,
              businessName: 'Test Professional',
              experienceYears: 5,
              hourlyRate: 50,
              serviceRadius: 10,
              isAvailable: true,
            }

            mockUserRepository.findOne.mockResolvedValue(mockProvider)
            mockProfessionalRepository.findOne.mockResolvedValue(null) // Not found for this provider

            // Property: Accessing professional from different provider must fail
            await expect(service.getProfessional(providerId, professionalId)).rejects.toThrow(
              NotFoundException
            )

            await expect(service.getProfessional(providerId, professionalId)).rejects.toThrow(
              'Professional not found or does not belong to this provider'
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain provider relationship when creating professionals', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          professionalTypeGen,
          businessNameGen,
          experienceYearsGen,
          hourlyRateGen,
          serviceRadiusGen,
          fc.array(uuidGen, { minLength: 1, maxLength: 5 }),
          async (
            providerId: string,
            professionalType: ProfessionalType,
            businessName: string,
            experienceYears: number,
            hourlyRate: number,
            serviceRadius: number,
            specializationIds: string[]
          ) => {
            // Setup mock provider
            const mockProvider = {
              id: providerId,
              email: `provider_${providerId}@test.com`,
              role: UserRole.PROVIDER,
              isEmailVerified: true,
            }

            // Setup mock categories
            const mockCategories = specializationIds.map(id => ({
              id,
              name: `Category ${id}`,
              isActive: true,
            }))

            // Setup mock user for professional
            const mockProfessionalUser = {
              id: fc.sample(uuidGen, 1)[0],
              email: `professional_${Date.now()}@temp.com`,
              role: UserRole.PROFESSIONAL,
              isEmailVerified: false,
            }

            // Setup mock professional profile
            const mockProfessional = {
              id: fc.sample(uuidGen, 1)[0],
              userId: mockProfessionalUser.id,
              providerId, // Must be set to the provider
              professionalType,
              businessName,
              experienceYears,
              hourlyRate,
              serviceRadius,
              specializations: mockCategories,
              isAvailable: true,
              rating: 0,
              totalJobs: 0,
              completionRate: 0,
              workingHours: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: [],
              },
              verificationStatus: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockProvider)
            mockServiceCategoryRepository.find.mockResolvedValue(mockCategories)
            mockUserRepository.create.mockReturnValue(mockProfessionalUser)
            mockUserRepository.save.mockResolvedValue(mockProfessionalUser)
            mockProfessionalRepository.create.mockReturnValue(mockProfessional)
            mockProfessionalRepository.save.mockResolvedValue(mockProfessional)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)

            const createDto: CreateProfessionalDto = {
              professionalType,
              businessName,
              experienceYears,
              hourlyRate,
              serviceRadius,
              specializationIds,
              workingHours: {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: [],
              },
            }

            const result = await service.createProfessional(providerId, createDto)

            // Property: Created professional must be linked to the provider
            expect(result.providerId).toBe(providerId)
            expect(result.professionalType).toBe(professionalType)
            expect(result.businessName).toBe(businessName)

            // Verify professional was created with correct providerId
            expect(mockProfessionalRepository.create).toHaveBeenCalledWith(
              expect.objectContaining({
                providerId,
                professionalType,
                businessName,
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 29: Profesyonel Devre Dışı Bırakma Etkisi (Professional Disable Effect)**
   *
   * **Validates: Requirements 8.6**
   *
   * When any professional is disabled (isAvailable = false), attempts to create new bookings
   * for that professional must be rejected. This ensures disabled professionals cannot receive
   * new work assignments.
   */
  describe('Property 29: Professional Disable Effect', () => {
    it('should set isAvailable to false when disabling any professional', async () => {
      await fc.assert(
        fc.asyncProperty(uuidGen, uuidGen, async (providerId: string, professionalId: string) => {
          // Setup mock provider
          const mockProvider = {
            id: providerId,
            email: `provider_${providerId}@test.com`,
            role: UserRole.PROVIDER,
            isEmailVerified: true,
          }

          // Setup mock professional (initially available)
          const mockProfessional = {
            id: professionalId,
            userId: fc.sample(uuidGen, 1)[0],
            providerId,
            professionalType: ProfessionalType.HANDYMAN,
            businessName: 'Test Professional',
            experienceYears: 5,
            hourlyRate: 50,
            serviceRadius: 10,
            isAvailable: true, // Initially available
            rating: 0,
            totalJobs: 0,
            completionRate: 0,
            workingHours: {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: [],
            },
            verificationStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          mockUserRepository.findOne.mockResolvedValue(mockProvider)
          mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
          mockProfessionalRepository.save.mockImplementation(async entity => {
            return { ...entity }
          })

          const result = await service.deleteProfessional(providerId, professionalId)

          // Property: Professional must be disabled (isAvailable = false)
          expect(result.message).toBe('Professional disabled successfully')
          expect(mockProfessionalRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
              id: professionalId,
              isAvailable: false,
            })
          )

          // Verify activity was logged
          expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: providerId,
              action: 'professional_disabled',
              resource: 'professional_profile',
              metadata: expect.objectContaining({
                professionalId,
              }),
            })
          )
        }),
        { numRuns: 100 }
      )
    })

    it('should preserve professional data when disabling (soft delete)', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          professionalTypeGen,
          businessNameGen,
          experienceYearsGen,
          async (
            providerId: string,
            professionalId: string,
            professionalType: ProfessionalType,
            businessName: string,
            experienceYears: number
          ) => {
            // Setup mock provider
            const mockProvider = {
              id: providerId,
              email: `provider_${providerId}@test.com`,
              role: UserRole.PROVIDER,
              isEmailVerified: true,
            }

            // Setup mock professional with data
            const mockProfessional = {
              id: professionalId,
              userId: fc.sample(uuidGen, 1)[0],
              providerId,
              professionalType,
              businessName,
              experienceYears,
              hourlyRate: 50,
              serviceRadius: 10,
              isAvailable: true,
              rating: 4.5,
              totalJobs: 25,
              completionRate: 95.5,
              workingHours: {
                monday: [{ start: '09:00', end: '17:00' }],
                tuesday: [{ start: '09:00', end: '17:00' }],
                wednesday: [{ start: '09:00', end: '17:00' }],
                thursday: [{ start: '09:00', end: '17:00' }],
                friday: [{ start: '09:00', end: '17:00' }],
                saturday: [],
                sunday: [],
              },
              verificationStatus: 'verified',
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date(),
            }

            let savedProfessional: any = null

            mockUserRepository.findOne.mockResolvedValue(mockProvider)
            mockProfessionalRepository.findOne.mockResolvedValue(mockProfessional)
            mockProfessionalRepository.save.mockImplementation(async entity => {
              savedProfessional = { ...entity }
              return savedProfessional
            })

            await service.deleteProfessional(providerId, professionalId)

            // Property: All professional data must be preserved except isAvailable
            expect(savedProfessional).toBeDefined()
            expect(savedProfessional.id).toBe(professionalId)
            expect(savedProfessional.providerId).toBe(providerId)
            expect(savedProfessional.professionalType).toBe(professionalType)
            expect(savedProfessional.businessName).toBe(businessName)
            expect(savedProfessional.experienceYears).toBe(experienceYears)
            expect(savedProfessional.rating).toBe(4.5)
            expect(savedProfessional.totalJobs).toBe(25)
            expect(savedProfessional.completionRate).toBe(95.5)
            expect(savedProfessional.isAvailable).toBe(false) // Only this should change
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should not allow disabling professionals from different providers', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          uuidGen,
          async (providerId: string, otherProviderId: string, professionalId: string) => {
            // Ensure providers are different
            fc.pre(providerId !== otherProviderId)

            // Setup mock provider
            const mockProvider = {
              id: providerId,
              email: `provider_${providerId}@test.com`,
              role: UserRole.PROVIDER,
              isEmailVerified: true,
            }

            // Professional belongs to different provider
            mockUserRepository.findOne.mockResolvedValue(mockProvider)
            mockProfessionalRepository.findOne.mockResolvedValue(null) // Not found for this provider

            // Property: Cannot disable professional from different provider
            await expect(service.deleteProfessional(providerId, professionalId)).rejects.toThrow(
              NotFoundException
            )

            await expect(service.deleteProfessional(providerId, professionalId)).rejects.toThrow(
              'Professional not found or does not belong to this provider'
            )

            // Verify save was not called
            expect(mockProfessionalRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain disabled state across multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(uuidGen, uuidGen, async (providerId: string, professionalId: string) => {
          // Setup mock provider
          const mockProvider = {
            id: providerId,
            email: `provider_${providerId}@test.com`,
            role: UserRole.PROVIDER,
            isEmailVerified: true,
          }

          // Setup mock professional
          const mockProfessional = {
            id: professionalId,
            userId: fc.sample(uuidGen, 1)[0],
            providerId,
            professionalType: ProfessionalType.HANDYMAN,
            businessName: 'Test Professional',
            experienceYears: 5,
            hourlyRate: 50,
            serviceRadius: 10,
            isAvailable: true,
            rating: 0,
            totalJobs: 0,
            completionRate: 0,
            workingHours: {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: [],
            },
            verificationStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          let currentState = { ...mockProfessional }

          mockUserRepository.findOne.mockResolvedValue(mockProvider)
          mockProfessionalRepository.findOne.mockImplementation(async () => currentState)
          mockProfessionalRepository.save.mockImplementation(async entity => {
            currentState = { ...currentState, ...entity }
            return currentState
          })

          // Disable the professional
          await service.deleteProfessional(providerId, professionalId)

          // Property: isAvailable must remain false
          expect(currentState.isAvailable).toBe(false)

          // Try to get the professional again
          const retrievedProfessional = await service.getProfessional(providerId, professionalId)

          // Property: Retrieved professional must still be disabled
          expect(retrievedProfessional.isAvailable).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should allow re-enabling disabled professionals through update', async () => {
      await fc.assert(
        fc.asyncProperty(uuidGen, uuidGen, async (providerId: string, professionalId: string) => {
          // Setup mock provider
          const mockProvider = {
            id: providerId,
            email: `provider_${providerId}@test.com`,
            role: UserRole.PROVIDER,
            isEmailVerified: true,
          }

          // Setup mock professional (disabled)
          const mockProfessional = {
            id: professionalId,
            userId: fc.sample(uuidGen, 1)[0],
            providerId,
            professionalType: ProfessionalType.HANDYMAN,
            businessName: 'Test Professional',
            experienceYears: 5,
            hourlyRate: 50,
            serviceRadius: 10,
            isAvailable: false, // Disabled
            specializations: [],
            rating: 0,
            totalJobs: 0,
            completionRate: 0,
            workingHours: {
              monday: [],
              tuesday: [],
              wednesday: [],
              thursday: [],
              friday: [],
              saturday: [],
              sunday: [],
            },
            verificationStatus: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          let currentState = { ...mockProfessional }

          mockUserRepository.findOne.mockResolvedValue(mockProvider)
          mockProfessionalRepository.findOne.mockImplementation(async () => currentState)
          mockProfessionalRepository.save.mockImplementation(async entity => {
            currentState = { ...currentState, ...entity }
            return currentState
          })

          // Re-enable the professional
          const result = await service.updateProfessional(providerId, professionalId, {
            isAvailable: true,
          })

          // Property: Professional can be re-enabled
          expect(result.isAvailable).toBe(true)
          expect(currentState.isAvailable).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })
})
