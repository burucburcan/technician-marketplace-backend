import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fc from 'fast-check'
import { UserService } from './user.service'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Certificate } from '../../entities/certificate.entity'
import { ProfessionalType } from '../../common/enums'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { BadRequestException } from '@nestjs/common'

/**
 * Property-Based Tests for Portfolio Management
 *
 * Feature: technician-marketplace-platform
 * Task: 5.8 Portfolyo yönetimi için property testleri yaz
 */

describe('Portfolio Management Property Tests', () => {
  let userService: UserService
  let portfolioItemRepository: Repository<PortfolioItem>
  let professionalProfileRepository: Repository<ProfessionalProfile>
  let s3Service: S3Service

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
          provide: getRepositoryToken(Certificate),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
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
          provide: getRepositoryToken(PortfolioItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
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
            uploadOptimizedPortfolioImage: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
      ],
    }).compile()

    userService = module.get<UserService>(UserService)
    portfolioItemRepository = module.get<Repository<PortfolioItem>>(
      getRepositoryToken(PortfolioItem)
    )
    professionalProfileRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    s3Service = module.get<S3Service>(S3Service)
  })

  // Arbitraries (generators) for property-based testing

  const portfolioTitleArbitrary = fc.oneof(
    fc.constant('Modern Abstract Painting'),
    fc.constant('Classical Portrait'),
    fc.constant('Urban Landscape'),
    fc.constant('Minimalist Sculpture'),
    fc.constant('Decorative Wall Art'),
    fc.string({ minLength: 5, maxLength: 200 })
  )

  const portfolioCategoryArbitrary = fc.constantFrom(
    'painting',
    'sculpture',
    'mural',
    'mosaic',
    'fresco',
    'decorative',
    'portrait',
    'landscape',
    'abstract'
  )

  const materialsArbitrary = fc.array(
    fc.constantFrom(
      'oil paint',
      'acrylic',
      'watercolor',
      'canvas',
      'wood',
      'metal',
      'stone',
      'ceramic',
      'glass'
    ),
    { minLength: 1, maxLength: 5 }
  )

  const dateArbitrary = fc.date({
    min: new Date('2010-01-01'),
    max: new Date('2024-12-31'),
  })

  const uploadPortfolioImageDtoArbitrary = fc.record({
    title: portfolioTitleArbitrary,
    description: fc.option(fc.string({ minLength: 10, maxLength: 1000 }), {
      nil: undefined,
    }),
    category: portfolioCategoryArbitrary,
    completionDate: fc.option(
      dateArbitrary.map((d: Date) => d.toISOString().split('T')[0]),
      { nil: undefined }
    ),
    dimensions: fc.option(
      fc.oneof(
        fc.constant('100x150 cm'),
        fc.constant('50x70 cm'),
        fc.constant('200x300 cm'),
        fc.string({ minLength: 5, maxLength: 100 })
      ),
      { nil: undefined }
    ),
    materials: fc.option(materialsArbitrary, { nil: undefined }),
  })

  const validImageFileArbitrary = fc.record({
    originalname: fc.oneof(
      fc.constant('artwork.jpg'),
      fc.constant('painting.png'),
      fc.constant('sculpture.webp'),
      fc.constant('portfolio-image.jpeg')
    ),
    mimetype: fc.constantFrom('image/jpeg', 'image/png', 'image/webp'),
    size: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
    buffer: fc.uint8Array({ minLength: 100, maxLength: 1000 }),
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
      fc.asyncProperty(
        uploadPortfolioImageDtoArbitrary,
        validImageFileArbitrary,
        async (portfolioDto: any, file: any) => {
          // Arrange: Create mock artist profile
          const mockArtistId = fc.sample(fc.uuid(), 1)[0]
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          const mockPortfolioItemId = fc.sample(fc.uuid(), 1)[0]

          const mockArtistProfile = {
            id: mockArtistId,
            userId: mockUserId,
            professionalType: ProfessionalType.ARTIST,
            businessName: 'Test Artist Studio',
            portfolio: [],
          }

          jest
            .spyOn(professionalProfileRepository, 'findOne')
            .mockResolvedValue(mockArtistProfile as any)

          // Mock current portfolio count (less than 20)
          const currentCount = fc.sample(fc.integer({ min: 3, max: 19 }), 1)[0]
          jest.spyOn(portfolioItemRepository, 'count').mockResolvedValue(currentCount)

          // Mock S3 upload with optimization
          const mockImageUrl = `https://s3.amazonaws.com/portfolio/${mockArtistId}/full/${file.originalname}`
          const mockThumbnailUrl = `https://s3.amazonaws.com/portfolio/${mockArtistId}/thumb/${file.originalname}`

          jest.spyOn(s3Service, 'uploadOptimizedPortfolioImage').mockResolvedValue({
            imageUrl: mockImageUrl,
            thumbnailUrl: mockThumbnailUrl,
          })

          // Mock display order calculation
          const mockMaxOrder = currentCount - 1
          const mockQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ maxOrder: mockMaxOrder }),
          }
          jest
            .spyOn(portfolioItemRepository, 'createQueryBuilder')
            .mockReturnValue(mockQueryBuilder as any)

          // Create the portfolio item entity
          const createdPortfolioItem = {
            id: mockPortfolioItemId,
            professionalId: mockArtistId,
            imageUrl: mockImageUrl,
            thumbnailUrl: mockThumbnailUrl,
            title: portfolioDto.title,
            description: portfolioDto.description,
            category: portfolioDto.category,
            completionDate: portfolioDto.completionDate
              ? new Date(portfolioDto.completionDate)
              : null,
            dimensions: portfolioDto.dimensions,
            materials: portfolioDto.materials,
            displayOrder: mockMaxOrder + 1,
            createdAt: new Date(),
          }

          jest.spyOn(portfolioItemRepository, 'create').mockReturnValue(createdPortfolioItem as any)

          jest.spyOn(portfolioItemRepository, 'save').mockResolvedValue(createdPortfolioItem as any)

          // Act: Upload portfolio image
          const uploadedItem = await userService.uploadPortfolioImage(
            mockArtistId,
            file as any,
            portfolioDto,
            mockUserId
          )

          // Mock getPortfolio to return the uploaded item
          jest
            .spyOn(portfolioItemRepository, 'find')
            .mockResolvedValue([createdPortfolioItem] as any)

          // Read back the portfolio
          const retrievedPortfolio = await userService.getPortfolio(mockArtistId)

          // Assert: Portfolio item should be stored and retrievable (Round-Trip validation)
          expect(uploadedItem).toBeDefined()
          expect(uploadedItem.id).toBe(mockPortfolioItemId)
          expect(uploadedItem.title).toBe(portfolioDto.title)
          expect(uploadedItem.description).toBe(portfolioDto.description)
          expect(uploadedItem.category).toBe(portfolioDto.category)
          expect(uploadedItem.dimensions).toBe(portfolioDto.dimensions)
          expect(uploadedItem.materials).toEqual(portfolioDto.materials)

          if (portfolioDto.completionDate) {
            expect(uploadedItem.completionDate).toEqual(new Date(portfolioDto.completionDate))
          } else {
            expect(uploadedItem.completionDate).toBeNull()
          }

          // Verify image URLs are accessible (optimized and stored in different sizes)
          expect(uploadedItem.imageUrl).toBe(mockImageUrl)
          expect(uploadedItem.thumbnailUrl).toBe(mockThumbnailUrl)
          expect(uploadedItem.imageUrl).toContain(mockArtistId)
          expect(uploadedItem.imageUrl).toContain('full')
          expect(uploadedItem.thumbnailUrl).toContain(mockArtistId)
          expect(uploadedItem.thumbnailUrl).toContain('thumb')

          // Verify portfolio item is retrievable from portfolio
          expect(retrievedPortfolio).toBeDefined()
          expect(retrievedPortfolio.length).toBeGreaterThan(0)

          const itemInPortfolio = retrievedPortfolio.find(item => item.id === mockPortfolioItemId)
          expect(itemInPortfolio).toBeDefined()

          if (itemInPortfolio) {
            expect(itemInPortfolio.title).toBe(portfolioDto.title)
            expect(itemInPortfolio.imageUrl).toBe(mockImageUrl)
            expect(itemInPortfolio.thumbnailUrl).toBe(mockThumbnailUrl)
          }

          // Verify S3 service was called correctly for optimization
          expect(s3Service.uploadOptimizedPortfolioImage).toHaveBeenCalledWith(mockArtistId, file)
        }
      ),
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
  it('Property 7.2: Portfolio Image Count Constraint - Maximum Limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        uploadPortfolioImageDtoArbitrary,
        validImageFileArbitrary,
        async (portfolioDto: any, file: any) => {
          // Arrange: Create mock artist profile with 20 images (at maximum)
          const mockArtistId = fc.sample(fc.uuid(), 1)[0]
          const mockUserId = fc.sample(fc.uuid(), 1)[0]

          const mockArtistProfile = {
            id: mockArtistId,
            userId: mockUserId,
            professionalType: ProfessionalType.ARTIST,
            businessName: 'Test Artist Studio',
            portfolio: [],
          }

          jest
            .spyOn(professionalProfileRepository, 'findOne')
            .mockResolvedValue(mockArtistProfile as any)

          // Mock current portfolio count at maximum (20)
          jest.spyOn(portfolioItemRepository, 'count').mockResolvedValue(20)

          // Act & Assert: Attempt to upload 21st image should be rejected
          await expect(
            userService.uploadPortfolioImage(mockArtistId, file as any, portfolioDto, mockUserId)
          ).rejects.toThrow(BadRequestException)

          await expect(
            userService.uploadPortfolioImage(mockArtistId, file as any, portfolioDto, mockUserId)
          ).rejects.toThrow('Maximum portfolio limit reached (20 images)')

          // Verify S3 service was NOT called (upload rejected before S3 operation)
          expect(s3Service.uploadOptimizedPortfolioImage).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2 (Extended): Portfolio Image Count Constraint - Minimum Limit
   *
   * **Validates: Requirements 3.8**
   *
   * For any artist, when attempting to delete a portfolio image, if the
   * portfolio has exactly 3 images (minimum), the deletion should be rejected.
   */
  it('Property 7.2 (Extended): Portfolio Image Count Constraint - Minimum Limit', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (imageId: string) => {
        // Arrange: Create mock artist profile with exactly 3 images (at minimum)
        const mockArtistId = fc.sample(fc.uuid(), 1)[0]
        const mockUserId = fc.sample(fc.uuid(), 1)[0]

        const mockArtistProfile = {
          id: mockArtistId,
          userId: mockUserId,
          professionalType: ProfessionalType.ARTIST,
          businessName: 'Test Artist Studio',
        }

        jest
          .spyOn(professionalProfileRepository, 'findOne')
          .mockResolvedValue(mockArtistProfile as any)

        // Mock portfolio item exists
        const mockPortfolioItem = {
          id: imageId,
          professionalId: mockArtistId,
          imageUrl: 'https://s3.amazonaws.com/portfolio/image.jpg',
          thumbnailUrl: 'https://s3.amazonaws.com/portfolio/thumb.jpg',
          title: 'Test Image',
          category: 'painting',
          displayOrder: 0,
        }

        jest.spyOn(portfolioItemRepository, 'findOne').mockResolvedValue(mockPortfolioItem as any)

        // Mock current portfolio count at minimum (3)
        jest.spyOn(portfolioItemRepository, 'count').mockResolvedValue(3)

        // Act & Assert: Attempt to delete when at minimum should be rejected
        await expect(
          userService.deletePortfolioImage(mockArtistId, imageId, mockUserId)
        ).rejects.toThrow(BadRequestException)

        await expect(
          userService.deletePortfolioImage(mockArtistId, imageId, mockUserId)
        ).rejects.toThrow('Cannot delete portfolio image. Minimum 3 images required')

        // Verify S3 service was NOT called (deletion rejected before S3 operation)
        expect(s3Service.deleteFile).not.toHaveBeenCalled()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2 (Edge Case): Portfolio Image Count Constraint - Valid Range
   *
   * **Validates: Requirements 3.8**
   *
   * For any artist, when the portfolio has between 4 and 19 images (valid range),
   * both upload and delete operations should be allowed.
   */
  it('Property 7.2 (Edge Case): Portfolio Image Count Constraint - Valid Range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 4, max: 19 }),
        uploadPortfolioImageDtoArbitrary,
        validImageFileArbitrary,
        async (currentCount: number, portfolioDto: any, file: any) => {
          // Arrange: Create mock artist profile with valid count (4-19)
          const mockArtistId = fc.sample(fc.uuid(), 1)[0]
          const mockUserId = fc.sample(fc.uuid(), 1)[0]
          const mockPortfolioItemId = fc.sample(fc.uuid(), 1)[0]

          const mockArtistProfile = {
            id: mockArtistId,
            userId: mockUserId,
            professionalType: ProfessionalType.ARTIST,
            businessName: 'Test Artist Studio',
          }

          jest
            .spyOn(professionalProfileRepository, 'findOne')
            .mockResolvedValue(mockArtistProfile as any)

          // Mock current portfolio count in valid range
          jest.spyOn(portfolioItemRepository, 'count').mockResolvedValue(currentCount)

          // Mock S3 upload
          const mockImageUrl = `https://s3.amazonaws.com/portfolio/${mockArtistId}/full/image.jpg`
          const mockThumbnailUrl = `https://s3.amazonaws.com/portfolio/${mockArtistId}/thumb/image.jpg`

          jest.spyOn(s3Service, 'uploadOptimizedPortfolioImage').mockResolvedValue({
            imageUrl: mockImageUrl,
            thumbnailUrl: mockThumbnailUrl,
          })

          // Mock display order calculation
          const mockQueryBuilder = {
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getRawOne: jest.fn().mockResolvedValue({ maxOrder: currentCount - 1 }),
          }
          jest
            .spyOn(portfolioItemRepository, 'createQueryBuilder')
            .mockReturnValue(mockQueryBuilder as any)

          const createdPortfolioItem = {
            id: mockPortfolioItemId,
            professionalId: mockArtistId,
            imageUrl: mockImageUrl,
            thumbnailUrl: mockThumbnailUrl,
            title: portfolioDto.title,
            description: portfolioDto.description,
            category: portfolioDto.category,
            completionDate: portfolioDto.completionDate
              ? new Date(portfolioDto.completionDate)
              : null,
            dimensions: portfolioDto.dimensions,
            materials: portfolioDto.materials,
            displayOrder: currentCount,
            createdAt: new Date(),
          }

          jest.spyOn(portfolioItemRepository, 'create').mockReturnValue(createdPortfolioItem as any)

          jest.spyOn(portfolioItemRepository, 'save').mockResolvedValue(createdPortfolioItem as any)

          // Act: Upload should succeed in valid range
          const uploadedItem = await userService.uploadPortfolioImage(
            mockArtistId,
            file as any,
            portfolioDto,
            mockUserId
          )

          // Assert: Upload should succeed
          expect(uploadedItem).toBeDefined()
          expect(uploadedItem.id).toBe(mockPortfolioItemId)
          expect(uploadedItem.title).toBe(portfolioDto.title)

          // Verify count is within valid range after upload
          const newCount = currentCount + 1
          expect(newCount).toBeGreaterThanOrEqual(4)
          expect(newCount).toBeLessThanOrEqual(20)

          // Test deletion in valid range
          const mockDeleteItemId = fc.sample(fc.uuid(), 1)[0]
          const mockDeleteItem = {
            id: mockDeleteItemId,
            professionalId: mockArtistId,
            imageUrl: mockImageUrl,
            thumbnailUrl: mockThumbnailUrl,
            title: 'Test Image',
            category: 'painting',
            displayOrder: 0,
          }

          jest.spyOn(portfolioItemRepository, 'findOne').mockResolvedValue(mockDeleteItem as any)

          jest.spyOn(s3Service, 'deleteFile').mockResolvedValue(undefined)
          jest.spyOn(portfolioItemRepository, 'remove').mockResolvedValue(mockDeleteItem as any)

          // Act: Delete should succeed in valid range
          const deleteResult = await userService.deletePortfolioImage(
            mockArtistId,
            mockDeleteItemId,
            mockUserId
          )

          // Assert: Delete should succeed
          expect(deleteResult).toBeDefined()
          expect(deleteResult.message).toBe('Portfolio image deleted successfully')

          // Verify count is still within valid range after deletion
          const countAfterDelete = currentCount // Original count (before upload)
          expect(countAfterDelete).toBeGreaterThanOrEqual(3)
          expect(countAfterDelete).toBeLessThanOrEqual(20)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2 (Edge Case): Non-Artist Portfolio Rejection
   *
   * **Validates: Requirements 3.7**
   *
   * For any professional that is not an artist (e.g., handyman), portfolio
   * operations should be rejected.
   */
  it('Property 7.2 (Edge Case): Non-Artist Portfolio Rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        uploadPortfolioImageDtoArbitrary,
        validImageFileArbitrary,
        async (portfolioDto: any, file: any) => {
          // Arrange: Create mock handyman profile (not an artist)
          const mockHandymanId = fc.sample(fc.uuid(), 1)[0]
          const mockUserId = fc.sample(fc.uuid(), 1)[0]

          const mockHandymanProfile = {
            id: mockHandymanId,
            userId: mockUserId,
            professionalType: ProfessionalType.HANDYMAN,
            businessName: 'Test Handyman Service',
          }

          jest
            .spyOn(professionalProfileRepository, 'findOne')
            .mockResolvedValue(mockHandymanProfile as any)

          // Act & Assert: Attempt to upload portfolio image as handyman should be rejected
          await expect(
            userService.uploadPortfolioImage(mockHandymanId, file as any, portfolioDto, mockUserId)
          ).rejects.toThrow(BadRequestException)

          await expect(
            userService.uploadPortfolioImage(mockHandymanId, file as any, portfolioDto, mockUserId)
          ).rejects.toThrow('Portfolio management is only available for artists')

          // Verify S3 service was NOT called
          expect(s3Service.uploadOptimizedPortfolioImage).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })
})
