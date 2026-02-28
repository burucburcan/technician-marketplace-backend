import { Test, TestingModule } from '@nestjs/testing'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { ListUsersDto, ListProvidersDto, ListProfessionalsDto, SuspendUserDto } from './dto'
import { UserRole, ProfessionalType } from '../../common/enums'

describe('AdminController', () => {
  let controller: AdminController
  let service: AdminService

  const mockAdminService = {
    listUsers: jest.fn(),
    listProviders: jest.fn(),
    listProfessionals: jest.fn(),
    suspendUser: jest.fn(),
    deleteUser: jest.fn(),
  }

  const mockRequest = {
    user: {
      userId: 'admin-id',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
    },
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile()

    controller = module.get<AdminController>(AdminController)
    service = module.get<AdminService>(AdminService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('listUsers', () => {
    it('should call adminService.listUsers with filters', async () => {
      const filters: ListUsersDto = {
        role: UserRole.USER,
        search: 'test',
        page: 1,
        limit: 20,
      }

      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }

      mockAdminService.listUsers.mockResolvedValue(expectedResult)

      const result = await controller.listUsers(filters)

      expect(service.listUsers).toHaveBeenCalledWith(filters)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('listProviders', () => {
    it('should call adminService.listProviders with filters', async () => {
      const filters: ListProvidersDto = {
        search: 'supplier',
        page: 1,
        limit: 20,
      }

      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }

      mockAdminService.listProviders.mockResolvedValue(expectedResult)

      const result = await controller.listProviders(filters)

      expect(service.listProviders).toHaveBeenCalledWith(filters)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('listProfessionals', () => {
    it('should call adminService.listProfessionals with filters', async () => {
      const filters: ListProfessionalsDto = {
        professionalType: ProfessionalType.HANDYMAN,
        search: 'professional',
        page: 1,
        limit: 20,
      }

      const expectedResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }

      mockAdminService.listProfessionals.mockResolvedValue(expectedResult)

      const result = await controller.listProfessionals(filters)

      expect(service.listProfessionals).toHaveBeenCalledWith(filters)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('suspendUser', () => {
    it('should call adminService.suspendUser with correct parameters', async () => {
      const userId = 'user-id'
      const suspendUserDto: SuspendUserDto = {
        isSuspended: true,
        reason: 'Test suspension',
      }

      const expectedResult = {
        id: userId,
        email: 'user@test.com',
        isSuspended: true,
      }

      mockAdminService.suspendUser.mockResolvedValue(expectedResult)

      const result = await controller.suspendUser(userId, suspendUserDto, mockRequest as any)

      expect(service.suspendUser).toHaveBeenCalledWith(userId, suspendUserDto, 'admin-id')
      expect(result).toEqual(expectedResult)
    })
  })

  describe('deleteUser', () => {
    it('should call adminService.deleteUser with correct parameters', async () => {
      const userId = 'user-id'

      const expectedResult = {
        message: 'User deleted successfully',
        deletedUserId: userId,
      }

      mockAdminService.deleteUser.mockResolvedValue(expectedResult)

      const result = await controller.deleteUser(userId, mockRequest as any)

      expect(service.deleteUser).toHaveBeenCalledWith(userId, 'admin-id')
      expect(result).toEqual(expectedResult)
    })
  })
})
