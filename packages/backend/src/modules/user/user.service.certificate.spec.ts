import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserService } from './user.service'
import { User } from '../../entities/user.entity'
import { UserProfile } from '../../entities/user-profile.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { ServiceCategory } from '../../entities/service-category.entity'
import { Certificate } from '../../entities/certificate.entity'
import { ActivityLogService } from '../activity-log/activity-log.service'
import { S3Service } from '../s3/s3.service'
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common'

describe('UserService - Certificate Management', () => {
  let service: UserService
  let certificateRepository: Repository<Certificate>
  let professionalProfileRepository: Repository<ProfessionalProfile>
  let s3Service: S3Service
  let activityLogService: ActivityLogService

  const mockCertificateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  }

  const mockProfessionalProfileRepository = {
    findOne: jest.fn(),
  }

  const mockS3Service = {
    uploadCertificate: jest.fn(),
  }

  const mockActivityLogService = {
    logActivity: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserProfile),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: mockProfessionalProfileRepository,
        },
        {
          provide: getRepositoryToken(ServiceCategory),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockCertificateRepository,
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
    certificateRepository = module.get<Repository<Certificate>>(getRepositoryToken(Certificate))
    professionalProfileRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    s3Service = module.get<S3Service>(S3Service)
    activityLogService = module.get<ActivityLogService>(ActivityLogService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadCertificate', () => {
    const professionalId = 'prof-123'
    const userId = 'user-123'
    const mockFile = {
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('test'),
    } as Express.Multer.File

    const uploadCertificateDto = {
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      issueDate: '2023-01-15',
      expiryDate: '2026-01-15',
    }

    it('should upload certificate successfully', async () => {
      const mockProfessionalProfile = {
        id: professionalId,
        userId,
      }

      const mockCertificate = {
        id: 'cert-123',
        professionalId,
        name: uploadCertificateDto.name,
        issuer: uploadCertificateDto.issuer,
        issueDate: new Date(uploadCertificateDto.issueDate),
        expiryDate: new Date(uploadCertificateDto.expiryDate),
        fileUrl: 'https://s3.amazonaws.com/certificates/prof-123/cert.pdf',
        verifiedByAdmin: false,
      }

      mockProfessionalProfileRepository.findOne.mockResolvedValue(mockProfessionalProfile)
      mockS3Service.uploadCertificate.mockResolvedValue(mockCertificate.fileUrl)
      mockCertificateRepository.create.mockReturnValue(mockCertificate)
      mockCertificateRepository.save.mockResolvedValue(mockCertificate)

      const result = await service.uploadCertificate(
        professionalId,
        mockFile,
        uploadCertificateDto,
        userId
      )

      expect(result).toEqual(mockCertificate)
      expect(mockProfessionalProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: professionalId },
      })
      expect(mockS3Service.uploadCertificate).toHaveBeenCalledWith(professionalId, mockFile)
      expect(mockCertificateRepository.create).toHaveBeenCalled()
      expect(mockCertificateRepository.save).toHaveBeenCalled()
      expect(mockActivityLogService.logActivity).toHaveBeenCalledWith({
        userId,
        action: 'certificate_uploaded',
        resource: 'certificate',
        metadata: {
          certificateId: mockCertificate.id,
          professionalId,
          name: uploadCertificateDto.name,
        },
      })
    })

    it('should throw NotFoundException if professional profile not found', async () => {
      mockProfessionalProfileRepository.findOne.mockResolvedValue(null)

      await expect(
        service.uploadCertificate(professionalId, mockFile, uploadCertificateDto, userId)
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not the owner', async () => {
      const mockProfessionalProfile = {
        id: professionalId,
        userId: 'different-user-id',
      }

      mockProfessionalProfileRepository.findOne.mockResolvedValue(mockProfessionalProfile)

      await expect(
        service.uploadCertificate(professionalId, mockFile, uploadCertificateDto, userId)
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw BadRequestException for invalid file type', async () => {
      const mockProfessionalProfile = {
        id: professionalId,
        userId,
      }

      const invalidFile = {
        ...mockFile,
        mimetype: 'application/zip',
      } as Express.Multer.File

      mockProfessionalProfileRepository.findOne.mockResolvedValue(mockProfessionalProfile)

      await expect(
        service.uploadCertificate(professionalId, invalidFile, uploadCertificateDto, userId)
      ).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException for file size too large', async () => {
      const mockProfessionalProfile = {
        id: professionalId,
        userId,
      }

      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      } as Express.Multer.File

      mockProfessionalProfileRepository.findOne.mockResolvedValue(mockProfessionalProfile)

      await expect(
        service.uploadCertificate(professionalId, largeFile, uploadCertificateDto, userId)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getCertificates', () => {
    const professionalId = 'prof-123'

    it('should return certificates for a professional', async () => {
      const mockProfessionalProfile = {
        id: professionalId,
        userId: 'user-123',
      }

      const mockCertificates = [
        {
          id: 'cert-1',
          professionalId,
          name: 'Certificate 1',
          issuer: 'Issuer 1',
          issueDate: new Date('2023-01-15'),
          expiryDate: new Date('2026-01-15'),
          fileUrl: 'https://s3.amazonaws.com/cert1.pdf',
          verifiedByAdmin: false,
          createdAt: new Date('2023-01-15'),
        },
        {
          id: 'cert-2',
          professionalId,
          name: 'Certificate 2',
          issuer: 'Issuer 2',
          issueDate: new Date('2023-02-20'),
          expiryDate: null,
          fileUrl: 'https://s3.amazonaws.com/cert2.pdf',
          verifiedByAdmin: true,
          createdAt: new Date('2023-02-20'),
        },
      ]

      mockProfessionalProfileRepository.findOne.mockResolvedValue(mockProfessionalProfile)
      mockCertificateRepository.find.mockResolvedValue(mockCertificates)

      const result = await service.getCertificates(professionalId)

      expect(result).toEqual(mockCertificates)
      expect(mockProfessionalProfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: professionalId },
      })
      expect(mockCertificateRepository.find).toHaveBeenCalledWith({
        where: { professionalId },
        order: { createdAt: 'DESC' },
      })
    })

    it('should throw NotFoundException if professional profile not found', async () => {
      mockProfessionalProfileRepository.findOne.mockResolvedValue(null)

      await expect(service.getCertificates(professionalId)).rejects.toThrow(NotFoundException)
    })

    it('should return empty array if no certificates found', async () => {
      const mockProfessionalProfile = {
        id: professionalId,
        userId: 'user-123',
      }

      mockProfessionalProfileRepository.findOne.mockResolvedValue(mockProfessionalProfile)
      mockCertificateRepository.find.mockResolvedValue([])

      const result = await service.getCertificates(professionalId)

      expect(result).toEqual([])
    })
  })
})
