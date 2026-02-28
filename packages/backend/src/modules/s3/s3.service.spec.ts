import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { S3Service } from './s3.service'

// Mock AWS S3
const mockS3 = {
  upload: jest.fn().mockReturnValue({
    promise: jest.fn(),
  }),
  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn(),
  }),
  deleteObjects: jest.fn().mockReturnValue({
    promise: jest.fn(),
  }),
  listObjectsV2: jest.fn().mockReturnValue({
    promise: jest.fn(),
  }),
}

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3),
}))

describe('S3Service', () => {
  let service: S3Service
  let configService: ConfigService

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET_NAME: 'test-bucket',
      }
      return config[key] || defaultValue
    }),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile()

    service = module.get<S3Service>(S3Service)
    configService = module.get<ConfigService>(ConfigService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('uploadProfilePhoto', () => {
    const mockFile = {
      originalname: 'profile.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image data'),
    } as Express.Multer.File

    it('should upload profile photo successfully', async () => {
      const expectedUrl = 'https://test-bucket.s3.amazonaws.com/profile-photos/user-1/uuid.jpg'
      mockS3.upload().promise.mockResolvedValue({ Location: expectedUrl })

      const result = await service.uploadProfilePhoto('user-1', mockFile)

      expect(result).toBe(expectedUrl)
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^profile-photos\/user-1\/.*\.jpg$/),
        Body: mockFile.buffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })
    })
  })

  describe('deleteProfilePhoto', () => {
    it('should delete profile photos successfully', async () => {
      const mockObjects = {
        Contents: [
          { Key: 'profile-photos/user-1/photo1.jpg' },
          { Key: 'profile-photos/user-1/photo2.jpg' },
        ],
      }
      mockS3.listObjectsV2().promise.mockResolvedValue(mockObjects)
      mockS3.deleteObjects().promise.mockResolvedValue({})

      await service.deleteProfilePhoto('user-1')

      expect(mockS3.listObjectsV2).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: 'profile-photos/user-1/',
      })
      expect(mockS3.deleteObjects).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Delete: {
          Objects: [
            { Key: 'profile-photos/user-1/photo1.jpg' },
            { Key: 'profile-photos/user-1/photo2.jpg' },
          ],
        },
      })
    })

    it('should handle case when no photos exist', async () => {
      mockS3.listObjectsV2().promise.mockResolvedValue({ Contents: [] })

      await service.deleteProfilePhoto('user-1')

      expect(mockS3.listObjectsV2).toHaveBeenCalled()
      expect(mockS3.deleteObjects).not.toHaveBeenCalled()
    })
  })

  describe('uploadCertificate', () => {
    const mockFile = {
      originalname: 'certificate.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test certificate data'),
    } as Express.Multer.File

    it('should upload certificate successfully', async () => {
      const expectedUrl = 'https://test-bucket.s3.amazonaws.com/certificates/prof-1/uuid.pdf'
      mockS3.upload().promise.mockResolvedValue({ Location: expectedUrl })

      const result = await service.uploadCertificate('prof-1', mockFile)

      expect(result).toBe(expectedUrl)
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^certificates\/prof-1\/.*\.pdf$/),
        Body: mockFile.buffer,
        ContentType: 'application/pdf',
        ACL: 'private',
      })
    })
  })

  describe('uploadPortfolioImage', () => {
    const mockFile = {
      originalname: 'artwork.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test artwork data'),
    } as Express.Multer.File

    it('should upload portfolio image successfully', async () => {
      const expectedUrl = 'https://test-bucket.s3.amazonaws.com/portfolio/artist-1/uuid.jpg'
      mockS3.upload().promise.mockResolvedValue({ Location: expectedUrl })

      const result = await service.uploadPortfolioImage('artist-1', mockFile)

      expect(result).toBe(expectedUrl)
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^portfolio\/artist-1\/.*\.jpg$/),
        Body: mockFile.buffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileUrl = 'https://test-bucket.s3.amazonaws.com/path/to/file.jpg'
      mockS3.deleteObject().promise.mockResolvedValue({})

      await service.deleteFile(fileUrl)

      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'path/to/file.jpg',
      })
    })
  })
})
