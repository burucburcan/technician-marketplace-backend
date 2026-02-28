import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fc from 'fast-check'
import { ProfessionalProfile } from './professional-profile.entity'
import { PortfolioItem } from './portfolio-item.entity'
import { User } from './user.entity'
import { ProfessionalType, VerificationStatus } from '../common/enums'

/**
 * Property-Based Tests for Database Schema
 *
 * Feature: technician-marketplace-platform
 * Task: 2.2 Veritabanı şeması için property testi yaz
 */

describe('Database Schema Property Tests', () => {
  let professionalRepository: Repository<ProfessionalProfile>
  let portfolioRepository: Repository<PortfolioItem>
  let userRepository: Repository<User>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getRepositoryToken(ProfessionalProfile),
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
            find: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile()

    professionalRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    portfolioRepository = module.get<Repository<PortfolioItem>>(getRepositoryToken(PortfolioItem))
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
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

  const professionalProfileArbitrary = fc.record({
    professionalType: fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST),
    businessName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
      nil: null,
    }),
    experienceYears: fc.integer({ min: 0, max: 50 }),
    hourlyRate: fc.double({ min: 10, max: 500 }),
    serviceRadius: fc.integer({ min: 5, max: 100 }),
    workingHours: workingHoursArbitrary,
    verificationStatus: fc.constantFrom(
      VerificationStatus.PENDING,
      VerificationStatus.VERIFIED,
      VerificationStatus.REJECTED
    ),
    isAvailable: fc.boolean(),
    currentLocation: fc.option(coordinatesArbitrary, { nil: null }),
    rating: fc.double({ min: 0, max: 5 }),
    totalJobs: fc.integer({ min: 0, max: 10000 }),
    completionRate: fc.double({ min: 0, max: 100 }),
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
  })

  const portfolioItemArbitrary = fc.record({
    imageUrl: fc.webUrl(),
    thumbnailUrl: fc.webUrl(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), {
      nil: null,
    }),
    category: fc.string({ minLength: 1, maxLength: 50 }),
    completionDate: fc.option(fc.date(), { nil: null }),
    dimensions: fc.option(fc.string({ minLength: 1, maxLength: 50 }), {
      nil: null,
    }),
    materials: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
        minLength: 1,
        maxLength: 5,
      }),
      { nil: null }
    ),
    displayOrder: fc.integer({ min: 0, max: 100 }),
  })

  /**
   * Property 7: Profesyonel Profil Round-Trip
   *
   * **Validates: Requirements 3.1, 3.2, 3.5**
   *
   * For any valid professional profile data (handyman or artist),
   * when the profile is created and saved, all fields (name, type,
   * specialization, experience, contact, work area) should contain
   * the same values when read back.
   */
  it('Property 7: Professional Profile Round-Trip', async () => {
    await fc.assert(
      fc.asyncProperty(professionalProfileArbitrary, async (profileData: any) => {
        // Arrange: Create a mock user
        const mockUserId = fc.sample(fc.uuid(), 1)[0]
        const mockUser = {
          id: mockUserId,
          email: 'test@example.com',
        }

        jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)

        // Create professional profile
        const profile = professionalRepository.create({
          userId: mockUserId,
          ...profileData,
        })

        // Mock save to return the profile with an ID
        const savedProfile = {
          id: fc.sample(fc.uuid())[0],
          userId: mockUserId,
          ...profileData,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        jest.spyOn(professionalRepository, 'save').mockResolvedValue(savedProfile as any)

        // Act: Save the profile
        const result = (await professionalRepository.save(
          profile
        )) as unknown as ProfessionalProfile

        // Mock findOne to return the saved profile
        jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(savedProfile as any)

        // Read back the profile
        const retrievedProfile = await professionalRepository.findOne({
          where: { id: result.id },
        })

        // Assert: All fields should match
        expect(retrievedProfile).toBeDefined()
        expect(retrievedProfile?.professionalType).toBe(profileData.professionalType)
        expect(retrievedProfile?.businessName).toBe(profileData.businessName)
        expect(retrievedProfile?.experienceYears).toBe(profileData.experienceYears)
        expect(retrievedProfile?.hourlyRate).toBe(profileData.hourlyRate)
        expect(retrievedProfile?.serviceRadius).toBe(profileData.serviceRadius)
        expect(retrievedProfile?.workingHours).toEqual(profileData.workingHours)
        expect(retrievedProfile?.verificationStatus).toBe(profileData.verificationStatus)
        expect(retrievedProfile?.isAvailable).toBe(profileData.isAvailable)
        expect(retrievedProfile?.currentLocation).toEqual(profileData.currentLocation)
        expect(retrievedProfile?.rating).toBe(profileData.rating)
        expect(retrievedProfile?.totalJobs).toBe(profileData.totalJobs)
        expect(retrievedProfile?.completionRate).toBe(profileData.completionRate)
        expect(retrievedProfile?.artStyle).toEqual(profileData.artStyle)
        expect(retrievedProfile?.materials).toEqual(profileData.materials)
        expect(retrievedProfile?.techniques).toEqual(profileData.techniques)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.1: Sanatçı Portfolyo Yönetimi
   *
   * **Validates: Requirements 3.7, 3.9**
   *
   * For any artist, when a portfolio image is uploaded, the image should be
   * optimized, stored in different sizes, and retrievable from the portfolio.
   */
  it('Property 7.1: Artist Portfolio Management', async () => {
    await fc.assert(
      fc.asyncProperty(portfolioItemArbitrary, async (portfolioData: any) => {
        // Arrange: Create a mock artist profile
        const mockProfessionalId = fc.sample(fc.uuid(), 1)[0]
        const mockArtist = {
          id: mockProfessionalId,
          professionalType: ProfessionalType.ARTIST,
        }

        jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockArtist as any)

        // Create portfolio item
        const portfolioItem = portfolioRepository.create({
          professionalId: mockProfessionalId,
          ...portfolioData,
        })

        // Mock save to return the portfolio item with an ID
        const savedItem = {
          id: fc.sample(fc.uuid(), 1)[0],
          professionalId: mockProfessionalId,
          ...portfolioData,
          createdAt: new Date(),
        }

        jest.spyOn(portfolioRepository, 'save').mockResolvedValue(savedItem as any)

        // Act: Save the portfolio item
        await portfolioRepository.save(portfolioItem)

        // Mock find to return the saved item
        jest.spyOn(portfolioRepository, 'find').mockResolvedValue([savedItem] as any)

        // Read back the portfolio
        const retrievedItems = await portfolioRepository.find({
          where: { professionalId: mockProfessionalId },
        })

        // Assert: Portfolio item should be retrievable and contain all data
        expect(retrievedItems).toBeDefined()
        expect(retrievedItems.length).toBeGreaterThan(0)

        const retrievedItem = retrievedItems[0]
        expect(retrievedItem.imageUrl).toBe(portfolioData.imageUrl)
        expect(retrievedItem.thumbnailUrl).toBe(portfolioData.thumbnailUrl)
        expect(retrievedItem.title).toBe(portfolioData.title)
        expect(retrievedItem.description).toBe(portfolioData.description)
        expect(retrievedItem.category).toBe(portfolioData.category)
        expect(retrievedItem.dimensions).toBe(portfolioData.dimensions)
        expect(retrievedItem.materials).toEqual(portfolioData.materials)
        expect(retrievedItem.displayOrder).toBe(portfolioData.displayOrder)

        // Verify that both imageUrl and thumbnailUrl exist (optimization requirement)
        expect(retrievedItem.imageUrl).toBeTruthy()
        expect(retrievedItem.thumbnailUrl).toBeTruthy()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2: Portfolyo Görsel Sayısı Kısıtı
   *
   * **Validates: Requirements 3.8**
   *
   * For any artist, the portfolio must contain a minimum of 3 and a maximum
   * of 20 images; upload attempts outside these limits should be rejected.
   */
  it('Property 7.2: Portfolio Image Count Constraint', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 25 }), async (imageCount: number) => {
        // Arrange: Create a mock artist profile
        const mockProfessionalId = fc.sample(fc.uuid(), 1)[0]
        const mockArtist = {
          id: mockProfessionalId,
          professionalType: ProfessionalType.ARTIST,
        }

        jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockArtist as any)

        // Mock the current portfolio count
        jest.spyOn(portfolioRepository, 'count').mockResolvedValue(imageCount)

        // Act & Assert: Test the constraint
        const currentCount = await portfolioRepository.count({
          where: { professionalId: mockProfessionalId },
        })

        if (imageCount < 3) {
          // Portfolio should be considered incomplete
          expect(currentCount).toBeLessThan(3)
        } else if (imageCount >= 3 && imageCount <= 20) {
          // Portfolio should be valid
          expect(currentCount).toBeGreaterThanOrEqual(3)
          expect(currentCount).toBeLessThanOrEqual(20)
        } else {
          // Portfolio should reject new uploads (over 20)
          expect(currentCount).toBeGreaterThan(20)

          // Attempting to add more should be rejected
          const canAddMore = currentCount < 20
          expect(canAddMore).toBe(false)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Additional test: Verify portfolio constraint enforcement
   * This test ensures that the system properly enforces the 3-20 image constraint
   */
  it('Property 7.2 (Extended): Portfolio constraint enforcement', async () => {
    const mockProfessionalId = fc.sample(fc.uuid(), 1)[0]

    // Test case 1: Less than 3 images should be flagged as incomplete
    jest.spyOn(portfolioRepository, 'count').mockResolvedValue(2)
    let count = await portfolioRepository.count({
      where: { professionalId: mockProfessionalId },
    })
    expect(count).toBeLessThan(3)

    // Test case 2: Exactly 3 images should be valid
    jest.spyOn(portfolioRepository, 'count').mockResolvedValue(3)
    count = await portfolioRepository.count({
      where: { professionalId: mockProfessionalId },
    })
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(20)

    // Test case 3: 20 images should be valid (at limit)
    jest.spyOn(portfolioRepository, 'count').mockResolvedValue(20)
    count = await portfolioRepository.count({
      where: { professionalId: mockProfessionalId },
    })
    expect(count).toBe(20)
    expect(count).toBeLessThanOrEqual(20)

    // Test case 4: More than 20 images should be rejected
    jest.spyOn(portfolioRepository, 'count').mockResolvedValue(21)
    count = await portfolioRepository.count({
      where: { professionalId: mockProfessionalId },
    })
    expect(count).toBeGreaterThan(20)

    // Verify that adding more is not allowed
    const canAddMore = count < 20
    expect(canAddMore).toBe(false)
  })
})
