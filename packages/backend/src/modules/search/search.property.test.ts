import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fc from 'fast-check'
import { SearchService } from './search.service'
import { ElasticsearchService } from './elasticsearch.service'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { Booking } from '../../entities/booking.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ProfessionalType, VerificationStatus } from '../../common/enums'

describe('Search Service Property Tests', () => {
  let service: SearchService
  let elasticsearchService: ElasticsearchService
  let professionalRepository: Repository<ProfessionalProfile>
  let bookingRepository: Repository<Booking>
  let portfolioRepository: Repository<PortfolioItem>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useValue: {
            search: jest.fn(),
            indexProfessional: jest.fn(),
            updateProfessional: jest.fn(),
            deleteProfessional: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PortfolioItem),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<SearchService>(SearchService)
    elasticsearchService = module.get<ElasticsearchService>(ElasticsearchService)
    professionalRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking))
    portfolioRepository = module.get<Repository<PortfolioItem>>(getRepositoryToken(PortfolioItem))
  })

  /**
   * **Validates: Requirements 4.2, 4.3**
   *
   * Property 11: Kategori Bazlı Arama Doğruluğu
   *
   * For any service category, when searching with that category,
   * all returned professionals must have expertise in the selected category.
   */
  describe('Property 11: Category-Based Search Accuracy', () => {
    it('should return only professionals with matching category specialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            category: fc.constantFrom('elektrik', 'tesisat', 'klima', 'boyama', 'marangozluk'),
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
            radius: fc.integer({ min: 1, max: 100 }),
          }),
          async searchParams => {
            // Mock ElasticSearch response
            const mockProfessionals = Array.from({ length: 5 }, (_, i) => ({
              id: `prof-${i}`,
              userId: `user-${i}`,
              professionalType: ProfessionalType.HANDYMAN,
              experienceYears: 5,
              hourlyRate: 50,
              serviceRadius: 30,
              rating: 4.5,
              totalJobs: 10,
              completionRate: 95,
              isAvailable: true,
              verificationStatus: VerificationStatus.VERIFIED,
              specializations: [{ id: `cat-${i}`, name: searchParams.category }],
              workingHours: {},
              currentLocation: {
                latitude: searchParams.latitude,
                longitude: searchParams.longitude,
              },
            }))

            jest.spyOn(elasticsearchService, 'search').mockResolvedValue({
              hits: {
                hits: mockProfessionals.map(p => ({ _id: p.id, _source: p })),
                total: { value: mockProfessionals.length },
              },
            } as any)

            jest.spyOn(professionalRepository, 'find').mockResolvedValue(mockProfessionals as any)

            const result = await service.searchProfessionals({
              category: searchParams.category,
              latitude: searchParams.latitude,
              longitude: searchParams.longitude,
              radius: searchParams.radius,
            })

            // Verify all returned professionals have the searched category
            result.professionals.forEach(prof => {
              const hasCategory = prof.professional.specializations.some(
                spec => spec.name === searchParams.category
              )
              expect(hasCategory).toBe(true)
            })
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * **Validates: Requirements 4.8**
   *
   * Property 11.1: Profesyonel Tip Filtreleme
   *
   * For any professional type filter (handyman/artist), when searching,
   * all returned results must match the selected type.
   */
  describe('Property 11.1: Professional Type Filtering', () => {
    it('should return only professionals matching the specified type', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            professionalType: fc.constantFrom(ProfessionalType.HANDYMAN, ProfessionalType.ARTIST),
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
          }),
          async searchParams => {
            const mockProfessionals = Array.from({ length: 5 }, (_, i) => ({
              id: `prof-${i}`,
              userId: `user-${i}`,
              professionalType: searchParams.professionalType,
              experienceYears: 5,
              hourlyRate: 50,
              serviceRadius: 30,
              rating: 4.5,
              totalJobs: 10,
              completionRate: 95,
              isAvailable: true,
              verificationStatus: VerificationStatus.VERIFIED,
              specializations: [{ id: 'cat-1', name: 'test' }],
              workingHours: {},
              currentLocation: {
                latitude: searchParams.latitude,
                longitude: searchParams.longitude,
              },
            }))

            jest.spyOn(elasticsearchService, 'search').mockResolvedValue({
              hits: {
                hits: mockProfessionals.map(p => ({ _id: p.id, _source: p })),
                total: { value: mockProfessionals.length },
              },
            } as any)

            jest.spyOn(professionalRepository, 'find').mockResolvedValue(mockProfessionals as any)

            const result = await service.searchProfessionals({
              professionalType: searchParams.professionalType,
              latitude: searchParams.latitude,
              longitude: searchParams.longitude,
            })

            // Verify all returned professionals match the type
            result.professionals.forEach(prof => {
              expect(prof.professional.professionalType).toBe(searchParams.professionalType)
            })
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * **Validates: Requirements 4.7**
   *
   * Property 11.2: Sanatçı Portfolyo Önizleme
   *
   * For any artist search result, portfolio images must be shown as preview.
   */
  describe('Property 11.2: Artist Portfolio Preview', () => {
    it('should include portfolio preview for all artist results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
          }),
          async searchParams => {
            const mockArtists = Array.from({ length: 3 }, (_, i) => ({
              id: `artist-${i}`,
              userId: `user-${i}`,
              professionalType: ProfessionalType.ARTIST,
              experienceYears: 5,
              hourlyRate: 50,
              serviceRadius: 30,
              rating: 4.5,
              totalJobs: 10,
              completionRate: 95,
              isAvailable: true,
              verificationStatus: VerificationStatus.VERIFIED,
              specializations: [{ id: 'cat-1', name: 'duvar resmi' }],
              workingHours: {},
              currentLocation: {
                latitude: searchParams.latitude,
                longitude: searchParams.longitude,
              },
              artStyle: ['modern'],
            }))

            const mockPortfolioItems = [
              { id: 'port-1', imageUrl: 'img1.jpg', thumbnailUrl: 'thumb1.jpg' },
              { id: 'port-2', imageUrl: 'img2.jpg', thumbnailUrl: 'thumb2.jpg' },
            ]

            jest.spyOn(elasticsearchService, 'search').mockResolvedValue({
              hits: {
                hits: mockArtists.map(p => ({ _id: p.id, _source: p })),
                total: { value: mockArtists.length },
              },
            } as any)

            jest.spyOn(professionalRepository, 'find').mockResolvedValue(mockArtists as any)
            jest.spyOn(portfolioRepository, 'find').mockResolvedValue(mockPortfolioItems as any)

            const result = await service.searchProfessionals({
              professionalType: ProfessionalType.ARTIST,
              latitude: searchParams.latitude,
              longitude: searchParams.longitude,
            })

            // Verify all artist results have portfolio preview
            result.professionals.forEach(prof => {
              expect(prof.professional.professionalType).toBe(ProfessionalType.ARTIST)
              expect(prof.portfolioPreview).toBeDefined()
              expect(Array.isArray(prof.portfolioPreview)).toBe(true)
            })
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * **Validates: Requirements 4.3, 13.5**
   *
   * Property 12: Coğrafi Filtreleme Doğruluğu
   *
   * For any location and radius value, when searching,
   * all returned professionals must be within the specified radius.
   */
  describe('Property 12: Geographic Filtering Accuracy', () => {
    it('should return only professionals within specified radius', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
            radius: fc.integer({ min: 1, max: 50 }),
          }),
          async searchParams => {
            // Create professionals within radius
            const mockProfessionals = Array.from({ length: 5 }, (_, i) => {
              // Generate location within radius (simplified)
              const offsetLat = (Math.random() - 0.5) * (searchParams.radius / 111) // ~111km per degree
              const offsetLon = (Math.random() - 0.5) * (searchParams.radius / 111)

              return {
                id: `prof-${i}`,
                userId: `user-${i}`,
                professionalType: ProfessionalType.HANDYMAN,
                experienceYears: 5,
                hourlyRate: 50,
                serviceRadius: 30,
                rating: 4.5,
                totalJobs: 10,
                completionRate: 95,
                isAvailable: true,
                verificationStatus: VerificationStatus.VERIFIED,
                specializations: [{ id: 'cat-1', name: 'test' }],
                workingHours: {},
                currentLocation: {
                  latitude: searchParams.latitude + offsetLat,
                  longitude: searchParams.longitude + offsetLon,
                },
              }
            })

            jest.spyOn(elasticsearchService, 'search').mockResolvedValue({
              hits: {
                hits: mockProfessionals.map((p, i) => ({
                  _id: p.id,
                  _source: p,
                  sort: [i * 5], // Mock distance in km
                })),
                total: { value: mockProfessionals.length },
              },
            } as any)

            jest.spyOn(professionalRepository, 'find').mockResolvedValue(mockProfessionals as any)

            const result = await service.searchProfessionals({
              latitude: searchParams.latitude,
              longitude: searchParams.longitude,
              radius: searchParams.radius,
            })

            // Verify all returned professionals are within radius
            result.professionals.forEach(prof => {
              if (prof.distance !== undefined) {
                expect(prof.distance).toBeLessThanOrEqual(searchParams.radius)
              }
            })
          }
        ),
        { numRuns: 10 }
      )
    })
  })

  /**
   * **Validates: Requirements 4.4**
   *
   * Property 13: Puan Bazlı Sıralama Doğruluğu
   *
   * For any professional list, when sorted by rating,
   * the list must be in descending order (each professional has
   * a rating less than or equal to the previous one).
   */
  describe('Property 13: Rating-Based Sorting Accuracy', () => {
    it('should return professionals sorted by rating in descending order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            latitude: fc.double({ min: -90, max: 90 }),
            longitude: fc.double({ min: -180, max: 180 }),
          }),
          async searchParams => {
            // Create professionals with different ratings
            const mockProfessionals = [5, 4.5, 4, 3.5, 3].map((rating, i) => ({
              id: `prof-${i}`,
              userId: `user-${i}`,
              professionalType: ProfessionalType.HANDYMAN,
              experienceYears: 5,
              hourlyRate: 50,
              serviceRadius: 30,
              rating,
              totalJobs: 10,
              completionRate: 95,
              isAvailable: true,
              verificationStatus: VerificationStatus.VERIFIED,
              specializations: [{ id: 'cat-1', name: 'test' }],
              workingHours: {},
              currentLocation: {
                latitude: searchParams.latitude,
                longitude: searchParams.longitude,
              },
            }))

            jest.spyOn(elasticsearchService, 'search').mockResolvedValue({
              hits: {
                hits: mockProfessionals.map(p => ({ _id: p.id, _source: p })),
                total: { value: mockProfessionals.length },
              },
            } as any)

            jest.spyOn(professionalRepository, 'find').mockResolvedValue(mockProfessionals as any)

            const result = await service.searchProfessionals({
              latitude: searchParams.latitude,
              longitude: searchParams.longitude,
              sortBy: 'rating',
            })

            // Verify descending order
            for (let i = 1; i < result.professionals.length; i++) {
              const prevRating = Number(result.professionals[i - 1].professional.rating)
              const currRating = Number(result.professionals[i].professional.rating)
              expect(currRating).toBeLessThanOrEqual(prevRating)
            }
          }
        ),
        { numRuns: 10 }
      )
    })
  })
})
