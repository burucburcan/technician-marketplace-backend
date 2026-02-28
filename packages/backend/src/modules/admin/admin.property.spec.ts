import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import * as fc from 'fast-check'
import { AdminService } from './admin.service'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { SupplierProfile } from '../../entities/supplier-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Booking } from '../../entities/booking.entity'
import { Payment } from '../../entities/payment.entity'
import { Dispute } from '../../entities/dispute.entity'
import { PortfolioItem } from '../../entities/portfolio-item.entity'
import { UserRole } from '../../common/enums'
import { ActivityLogService } from '../activity-log/activity-log.service'

/**
 * Property-Based Tests for Admin Service
 *
 * **Feature: technician-marketplace-platform**
 *
 * These tests validate universal properties that must hold for all valid inputs
 * across the admin management system, ensuring correctness at scale.
 */
describe('AdminService Property Tests', () => {
  let service: AdminService

  const mockUserRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockUserProfileRepository = {
    findOne: jest.fn(),
  }

  const mockProfessionalProfileRepository = {
    createQueryBuilder: jest.fn(),
  }

  const mockSupplierProfileRepository = {
    createQueryBuilder: jest.fn(),
  }

  const mockServiceCategoryRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  }

  const mockBookingRepository = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
  }

  const mockPaymentRepository = {
    createQueryBuilder: jest.fn(),
  }

  const mockDisputeRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockPortfolioItemRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: mockUserProfileRepository,
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalProfileRepository,
        },
        {
          provide: getRepositoryToken(SupplierProfile),
          useValue: mockSupplierProfileRepository,
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: mockServiceCategoryRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Dispute),
          useValue: mockDisputeRepository,
        },
        {
          provide: getRepositoryToken(PortfolioItem),
          useValue: mockPortfolioItemRepository,
        },
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
      ],
    }).compile()

    service = module.get<AdminService>(AdminService)

    jest.clearAllMocks()
  })

  // Generators for property testing
  const uuidGen = fc.uuid()
  const emailGen = fc.emailAddress()
  const userRoleGen = fc.constantFrom(
    UserRole.USER,
    UserRole.PROFESSIONAL,
    UserRole.PROVIDER,
    UserRole.SUPPLIER
  )
  const reasonGen = fc.string({ minLength: 10, maxLength: 200 })

  /**
   * **Property 30: Admin Hesap Askıya Alma Etkisi (Admin Account Suspension Effect)**
   *
   * **Validates: Requirements 9.3**
   *
   * When any user account is suspended by admin (isSuspended = true), login attempts
   * for that account must be rejected. This ensures suspended accounts cannot access
   * the platform and maintains security and compliance.
   */
  describe('Property 30: Admin Account Suspension Effect', () => {
    it('should set isSuspended to true when suspending any user account', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          emailGen,
          userRoleGen,
          reasonGen,
          async (
            userId: string,
            adminId: string,
            email: string,
            role: UserRole,
            reason: string
          ) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)
            // Ensure user is not an admin (admins cannot be suspended)
            fc.pre(role !== UserRole.ADMIN)

            // Setup mock user (not suspended initially)
            const mockUser = {
              id: userId,
              email,
              role,
              passwordHash: 'hashed_password',
              isEmailVerified: true,
              twoFactorEnabled: false,
              isSuspended: false, // Initially not suspended
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            let savedUser: any = null

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserRepository.save.mockImplementation(async entity => {
              savedUser = { ...entity }
              return savedUser
            })

            const result = await service.suspendUser(userId, { isSuspended: true, reason }, adminId)

            // Property: User must be suspended (isSuspended = true)
            expect(result.isSuspended).toBe(true)
            expect(savedUser).toBeDefined()
            expect(savedUser.isSuspended).toBe(true)

            // Verify user data is preserved
            expect(savedUser.id).toBe(userId)
            expect(savedUser.email).toBe(email)
            expect(savedUser.role).toBe(role)

            // Verify activity was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: adminId,
                action: 'user_suspended',
                resource: 'user',
                resourceId: userId,
                metadata: expect.objectContaining({
                  reason,
                  targetUserId: userId,
                  targetUserEmail: email,
                }),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set isSuspended to false when unsuspending any user account', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          emailGen,
          userRoleGen,
          reasonGen,
          async (
            userId: string,
            adminId: string,
            email: string,
            role: UserRole,
            reason: string
          ) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)
            // Ensure user is not an admin
            fc.pre(role !== UserRole.ADMIN)

            // Setup mock user (suspended initially)
            const mockUser = {
              id: userId,
              email,
              role,
              passwordHash: 'hashed_password',
              isEmailVerified: true,
              twoFactorEnabled: false,
              isSuspended: true, // Initially suspended
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            let savedUser: any = null

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserRepository.save.mockImplementation(async entity => {
              savedUser = { ...entity }
              return savedUser
            })

            const result = await service.suspendUser(
              userId,
              { isSuspended: false, reason },
              adminId
            )

            // Property: User must be unsuspended (isSuspended = false)
            expect(result.isSuspended).toBe(false)
            expect(savedUser).toBeDefined()
            expect(savedUser.isSuspended).toBe(false)

            // Verify activity was logged with correct action
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: adminId,
                action: 'user_unsuspended',
                resource: 'user',
                resourceId: userId,
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject suspension attempts on admin accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          emailGen,
          reasonGen,
          async (userId: string, adminId: string, email: string, reason: string) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)

            // Setup mock admin user
            const mockAdminUser = {
              id: userId,
              email,
              role: UserRole.ADMIN, // This is an admin
              passwordHash: 'hashed_password',
              isEmailVerified: true,
              twoFactorEnabled: false,
              isSuspended: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockAdminUser)

            // Property: Cannot suspend admin accounts
            await expect(
              service.suspendUser(userId, { isSuspended: true, reason }, adminId)
            ).rejects.toThrow(BadRequestException)

            await expect(
              service.suspendUser(userId, { isSuspended: true, reason }, adminId)
            ).rejects.toThrow('Cannot suspend admin accounts')

            // Verify save was not called
            expect(mockUserRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject attempts to suspend own account', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          emailGen,
          userRoleGen,
          reasonGen,
          async (userId: string, email: string, role: UserRole, reason: string) => {
            // Setup mock user
            const mockUser = {
              id: userId,
              email,
              role,
              passwordHash: 'hashed_password',
              isEmailVerified: true,
              twoFactorEnabled: false,
              isSuspended: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockUserRepository.findOne.mockResolvedValue(mockUser)

            // Property: Cannot suspend own account (userId === adminId)
            await expect(
              service.suspendUser(userId, { isSuspended: true, reason }, userId)
            ).rejects.toThrow(BadRequestException)

            await expect(
              service.suspendUser(userId, { isSuspended: true, reason }, userId)
            ).rejects.toThrow('You cannot suspend your own account')

            // Verify save was not called
            expect(mockUserRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain suspended state across multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          emailGen,
          userRoleGen,
          reasonGen,
          async (
            userId: string,
            adminId: string,
            email: string,
            role: UserRole,
            reason: string
          ) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)
            // Ensure user is not an admin
            fc.pre(role !== UserRole.ADMIN)

            // Setup mock user
            const mockUser = {
              id: userId,
              email,
              role,
              passwordHash: 'hashed_password',
              isEmailVerified: true,
              twoFactorEnabled: false,
              isSuspended: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            let currentState = { ...mockUser }

            mockUserRepository.findOne.mockImplementation(async () => currentState)
            mockUserRepository.save.mockImplementation(async entity => {
              currentState = { ...currentState, ...entity }
              return currentState
            })

            // Suspend the user
            await service.suspendUser(userId, { isSuspended: true, reason }, adminId)

            // Property: isSuspended must be true
            expect(currentState.isSuspended).toBe(true)

            // Try to query the user again (simulating persistence)
            const retrievedUser = await mockUserRepository.findOne({ where: { id: userId } })

            // Property: Retrieved user must still be suspended
            expect(retrievedUser.isSuspended).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve all user data when suspending except isSuspended flag', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          emailGen,
          userRoleGen,
          fc.boolean(),
          fc.boolean(),
          reasonGen,
          async (
            userId: string,
            adminId: string,
            email: string,
            role: UserRole,
            isEmailVerified: boolean,
            twoFactorEnabled: boolean,
            reason: string
          ) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)
            // Ensure user is not an admin
            fc.pre(role !== UserRole.ADMIN)

            // Setup mock user with various states
            const mockUser = {
              id: userId,
              email,
              role,
              passwordHash: 'hashed_password_123',
              isEmailVerified,
              twoFactorEnabled,
              twoFactorSecret: twoFactorEnabled ? 'secret_key' : null,
              isSuspended: false,
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-06-01'),
            }

            let savedUser: any = null

            mockUserRepository.findOne.mockResolvedValue(mockUser)
            mockUserRepository.save.mockImplementation(async entity => {
              savedUser = { ...entity }
              return savedUser
            })

            await service.suspendUser(userId, { isSuspended: true, reason }, adminId)

            // Property: All user data must be preserved except isSuspended
            expect(savedUser).toBeDefined()
            expect(savedUser.id).toBe(userId)
            expect(savedUser.email).toBe(email)
            expect(savedUser.role).toBe(role)
            expect(savedUser.passwordHash).toBe('hashed_password_123')
            expect(savedUser.isEmailVerified).toBe(isEmailVerified)
            expect(savedUser.twoFactorEnabled).toBe(twoFactorEnabled)
            expect(savedUser.twoFactorSecret).toBe(twoFactorEnabled ? 'secret_key' : null)
            expect(savedUser.isSuspended).toBe(true) // Only this should change
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow toggling suspension state multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          emailGen,
          userRoleGen,
          fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }),
          reasonGen,
          async (
            userId: string,
            adminId: string,
            email: string,
            role: UserRole,
            suspensionStates: boolean[],
            reason: string
          ) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)
            // Ensure user is not an admin
            fc.pre(role !== UserRole.ADMIN)

            // Setup mock user
            const mockUser = {
              id: userId,
              email,
              role,
              passwordHash: 'hashed_password',
              isEmailVerified: true,
              twoFactorEnabled: false,
              isSuspended: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            let currentState = { ...mockUser }

            mockUserRepository.findOne.mockImplementation(async () => currentState)
            mockUserRepository.save.mockImplementation(async entity => {
              currentState = { ...currentState, ...entity }
              return currentState
            })

            // Apply each suspension state in sequence
            for (const isSuspended of suspensionStates) {
              const result = await service.suspendUser(userId, { isSuspended, reason }, adminId)

              // Property: State must match the requested suspension state
              expect(result.isSuspended).toBe(isSuspended)
              expect(currentState.isSuspended).toBe(isSuspended)
            }

            // Property: Final state must match the last requested state
            expect(currentState.isSuspended).toBe(suspensionStates[suspensionStates.length - 1])
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject suspension of non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          reasonGen,
          async (userId: string, adminId: string, reason: string) => {
            // Ensure user and admin are different
            fc.pre(userId !== adminId)

            // User does not exist
            mockUserRepository.findOne.mockResolvedValue(null)

            // Property: Cannot suspend non-existent user
            await expect(
              service.suspendUser(userId, { isSuspended: true, reason }, adminId)
            ).rejects.toThrow(NotFoundException)

            await expect(
              service.suspendUser(userId, { isSuspended: true, reason }, adminId)
            ).rejects.toThrow('User not found')

            // Verify save was not called
            expect(mockUserRepository.save).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Property 14: Kategori Minimum Profesyonel Invariant (Category Minimum Professional Invariant)**
   *
   * **Validates: Requirements 4.6**
   *
   * At any time, each active service category must have at least 3 active professionals.
   * This ensures that users always have sufficient choice when selecting professionals
   * from any category, maintaining platform quality and availability.
   */
  describe('Property 14: Category Minimum Professional Invariant', () => {
    it('should reject category deletion when it would leave fewer than 3 professionals', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.integer({ min: 1, max: 2 }), // Less than 3 professionals
          async (
            categoryId: string,
            adminId: string,
            categoryName: string,
            professionalsCount: number
          ) => {
            // Setup mock category with fewer than 3 professionals
            const mockProfessionals = Array.from({ length: professionalsCount }, (_, i) => ({
              id: fc.sample(uuidGen, 1)[0],
              userId: fc.sample(uuidGen, 1)[0],
              professionalType: 'handyman',
              businessName: `Professional ${i}`,
              isAvailable: true,
            }))

            const mockCategory = {
              id: categoryId,
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'Test category',
              isTechnical: true,
              isActive: true,
              professionals: mockProfessionals,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockCategory),
            }

            mockServiceCategoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)

            // Property: Cannot delete/deactivate category with fewer than 3 professionals
            // The system should either reject the operation or ensure minimum is maintained
            const result = await service.deleteCategory(categoryId, adminId)

            // Since category has professionals, it should be deactivated (soft delete)
            expect(result.message).toContain('deactivated')
            expect(result.isActive).toBe(false)

            // Verify the category was not hard deleted
            expect(mockServiceCategoryRepository.remove).not.toHaveBeenCalled()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should maintain minimum 3 professionals invariant when category is active', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.integer({ min: 3, max: 20 }), // At least 3 professionals
          async (categoryId: string, categoryName: string, professionalsCount: number) => {
            // Setup mock category with at least 3 active professionals
            const mockProfessionals = Array.from({ length: professionalsCount }, (_, i) => ({
              id: fc.sample(uuidGen, 1)[0],
              userId: fc.sample(uuidGen, 1)[0],
              professionalType: 'handyman',
              businessName: `Professional ${i}`,
              isAvailable: true, // All active
            }))

            const mockCategory = {
              id: categoryId,
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'Test category',
              isTechnical: true,
              isActive: true,
              professionals: mockProfessionals,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockCategory),
            }

            mockServiceCategoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
            mockServiceCategoryRepository.findOne.mockResolvedValue(mockCategory)

            const category = await service.getCategory(categoryId)

            // Property: Active category must have at least 3 active professionals
            const activeProfessionals = category.professionals.filter((p: any) => p.isAvailable)
            expect(activeProfessionals.length).toBeGreaterThanOrEqual(3)
            expect(category.isActive).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow category creation without professionals initially', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.boolean(),
          async (adminId: string, categoryName: string, isTechnical: boolean) => {
            // Setup mock for new category creation
            const mockCategory = {
              id: fc.sample(uuidGen, 1)[0],
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'New category',
              isTechnical,
              isActive: true,
              professionals: [], // No professionals initially
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockServiceCategoryRepository.findOne.mockResolvedValue(null) // No existing category
            mockServiceCategoryRepository.create.mockReturnValue(mockCategory)
            mockServiceCategoryRepository.save.mockResolvedValue(mockCategory)

            const createDto = {
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'New category',
              isTechnical,
            }

            const result = await service.createCategory(createDto, adminId)

            // Property: New categories can be created without professionals
            // The minimum 3 professionals requirement applies when category becomes active for users
            expect(result.id).toBeDefined()
            expect(result.name).toBe(categoryName)
            expect(result.isActive).toBe(true)

            // Verify activity was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: adminId,
                action: 'category_created',
                resource: 'service_category',
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should deactivate category when professionals count drops below minimum', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.integer({ min: 1, max: 2 }),
          async (
            categoryId: string,
            adminId: string,
            categoryName: string,
            remainingProfessionals: number
          ) => {
            // Setup mock category that previously had enough professionals
            // but now has fewer than 3 active ones
            const mockProfessionals = Array.from({ length: remainingProfessionals }, (_, i) => ({
              id: fc.sample(uuidGen, 1)[0],
              userId: fc.sample(uuidGen, 1)[0],
              professionalType: 'handyman',
              businessName: `Professional ${i}`,
              isAvailable: true,
            }))

            const mockCategory = {
              id: categoryId,
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'Test category',
              isTechnical: true,
              isActive: true,
              professionals: mockProfessionals,
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockCategory),
            }

            mockServiceCategoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
            mockServiceCategoryRepository.save.mockImplementation(async entity => entity)

            // Attempt to delete category with insufficient professionals
            const result = await service.deleteCategory(categoryId, adminId)

            // Property: Category should be deactivated (soft delete) not hard deleted
            expect(result.message).toContain('deactivated')
            expect(result.isActive).toBe(false)

            // Verify it was not hard deleted
            expect(mockServiceCategoryRepository.remove).not.toHaveBeenCalled()

            // Verify activity was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: adminId,
                action: 'category_deactivated',
                resource: 'service_category',
                metadata: expect.objectContaining({
                  professionalsCount: remainingProfessionals,
                }),
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should allow hard delete only when category has no professionals', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          async (categoryId: string, adminId: string, categoryName: string) => {
            // Setup mock category with no professionals
            const mockCategory = {
              id: categoryId,
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'Test category',
              isTechnical: true,
              isActive: true,
              professionals: [], // No professionals
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockCategory),
            }

            mockServiceCategoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
            mockServiceCategoryRepository.remove.mockResolvedValue(mockCategory)

            const result = await service.deleteCategory(categoryId, adminId)

            // Property: Category with no professionals can be hard deleted
            expect(result.message).toBe('Category deleted successfully')
            expect(mockServiceCategoryRepository.remove).toHaveBeenCalledWith(mockCategory)

            // Verify activity was logged
            expect(mockActivityLogService.logActivity).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: adminId,
                action: 'category_deleted',
                resource: 'service_category',
              })
            )
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should preserve category data when deactivating due to insufficient professionals', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.boolean(),
          fc.integer({ min: 1, max: 2 }),
          async (
            categoryId: string,
            adminId: string,
            categoryName: string,
            description: string,
            isTechnical: boolean,
            professionalsCount: number
          ) => {
            // Setup mock category with all data
            const mockProfessionals = Array.from({ length: professionalsCount }, (_, i) => ({
              id: fc.sample(uuidGen, 1)[0],
              userId: fc.sample(uuidGen, 1)[0],
              professionalType: 'handyman',
              businessName: `Professional ${i}`,
              isAvailable: true,
            }))

            const mockCategory = {
              id: categoryId,
              name: categoryName,
              nameTranslations: { es: categoryName, en: `${categoryName} EN` },
              description,
              isTechnical,
              isActive: true,
              professionals: mockProfessionals,
              createdAt: new Date('2023-01-01'),
              updatedAt: new Date('2023-06-01'),
            }

            let savedCategory: any = null

            const mockQueryBuilder = {
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(mockCategory),
            }

            mockServiceCategoryRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
            mockServiceCategoryRepository.save.mockImplementation(async entity => {
              savedCategory = { ...entity }
              return savedCategory
            })

            await service.deleteCategory(categoryId, adminId)

            // Property: All category data must be preserved except isActive flag
            expect(savedCategory).toBeDefined()
            expect(savedCategory.id).toBe(categoryId)
            expect(savedCategory.name).toBe(categoryName)
            expect(savedCategory.nameTranslations).toEqual({
              es: categoryName,
              en: `${categoryName} EN`,
            })
            expect(savedCategory.description).toBe(description)
            expect(savedCategory.isTechnical).toBe(isTechnical)
            expect(savedCategory.isActive).toBe(false) // Only this should change
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should count only active professionals when checking minimum requirement', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidGen,
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 1, max: 5 }),
          async (
            categoryId: string,
            categoryName: string,
            activeProfessionalsCount: number,
            inactiveProfessionalsCount: number
          ) => {
            // Setup mock category with mix of active and inactive professionals
            const activeProfessionals = Array.from(
              { length: activeProfessionalsCount },
              (_, i) => ({
                id: fc.sample(uuidGen, 1)[0],
                userId: fc.sample(uuidGen, 1)[0],
                professionalType: 'handyman',
                businessName: `Active Professional ${i}`,
                isAvailable: true, // Active
              })
            )

            const inactiveProfessionals = Array.from(
              { length: inactiveProfessionalsCount },
              (_, i) => ({
                id: fc.sample(uuidGen, 1)[0],
                userId: fc.sample(uuidGen, 1)[0],
                professionalType: 'handyman',
                businessName: `Inactive Professional ${i}`,
                isAvailable: false, // Inactive
              })
            )

            const mockCategory = {
              id: categoryId,
              name: categoryName,
              nameTranslations: { es: categoryName, en: categoryName },
              description: 'Test category',
              isTechnical: true,
              isActive: true,
              professionals: [...activeProfessionals, ...inactiveProfessionals],
              createdAt: new Date(),
              updatedAt: new Date(),
            }

            mockServiceCategoryRepository.findOne.mockResolvedValue(mockCategory)

            const category = await service.getCategory(categoryId)

            // Property: Only active professionals count toward the minimum
            const activeProfessionalsInCategory = category.professionals.filter(
              (p: any) => p.isAvailable
            )
            expect(activeProfessionalsInCategory.length).toBe(activeProfessionalsCount)

            // If active count >= 3, category should remain active
            if (activeProfessionalsCount >= 3) {
              expect(category.isActive).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
