import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BookingService } from './booking.service'
import { Booking } from '../../entities/booking.entity'
import { ProfessionalProfile } from '../../entities/professional-profile.entity'
import { User } from '../../entities/user.entity'
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { BookingStatus, PaymentStatus, ProfessionalType } from '../../common/enums'
import { CreateBookingDto } from './dto/create-booking.dto'

describe('BookingService', () => {
  let service: BookingService
  let bookingRepository: Repository<Booking>
  let professionalRepository: Repository<ProfessionalProfile>
  let userRepository: Repository<User>

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
  }

  const mockProfessional = {
    id: 'prof-123',
    userId: 'prof-user-123',
    professionalType: ProfessionalType.HANDYMAN,
    isAvailable: true,
  }

  const mockBookingDto: CreateBookingDto = {
    professionalId: 'prof-123',
    professionalType: ProfessionalType.HANDYMAN,
    serviceCategory: 'plumbing',
    scheduledDate: new Date('2024-12-20T10:00:00Z'),
    estimatedDuration: 120,
    serviceAddress: {
      address: '123 Main St',
      city: 'Mexico City',
      state: 'CDMX',
      country: 'Mexico',
      postalCode: '12345',
      coordinates: {
        latitude: 19.4326,
        longitude: -99.1332,
      },
    },
    description: 'Fix leaking pipe',
    estimatedPrice: 500,
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ProfessionalProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get<BookingService>(BookingService)
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking))
    professionalRepository = module.get<Repository<ProfessionalProfile>>(
      getRepositoryToken(ProfessionalProfile)
    )
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const mockBooking = {
        id: 'booking-123',
        ...mockBookingDto,
        userId: mockUser.id,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional as any)
      jest.spyOn(bookingRepository, 'create').mockReturnValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking as any)

      // Mock no conflicts
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }
      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any)

      const result = await service.createBooking(mockUser.id, mockBookingDto)

      expect(result).toEqual(mockBooking)
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      })
      expect(professionalRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockBookingDto.professionalId },
      })
      expect(bookingRepository.save).toHaveBeenCalled()
    })

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null)

      await expect(service.createBooking(mockUser.id, mockBookingDto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw NotFoundException if professional not found', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(null)

      await expect(service.createBooking(mockUser.id, mockBookingDto)).rejects.toThrow(
        NotFoundException
      )
    })

    it('should throw BadRequestException if professional is not available', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest
        .spyOn(professionalRepository, 'findOne')
        .mockResolvedValue({ ...mockProfessional, isAvailable: false } as any)

      await expect(service.createBooking(mockUser.id, mockBookingDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException if professional type mismatch', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue({
        ...mockProfessional,
        professionalType: ProfessionalType.ARTIST,
      } as any)

      await expect(service.createBooking(mockUser.id, mockBookingDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw BadRequestException if artist booking without project details', async () => {
      const artistBookingDto = {
        ...mockBookingDto,
        professionalType: ProfessionalType.ARTIST,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue({
        ...mockProfessional,
        professionalType: ProfessionalType.ARTIST,
      } as any)

      await expect(service.createBooking(mockUser.id, artistBookingDto)).rejects.toThrow(
        BadRequestException
      )
    })

    it('should create artist booking with project details', async () => {
      const artistBookingDto: CreateBookingDto = {
        ...mockBookingDto,
        professionalType: ProfessionalType.ARTIST,
        projectDetails: {
          projectType: 'Mural',
          estimatedDuration: '2 weeks',
          priceRange: {
            min: 5000,
            max: 10000,
            currency: 'MXN',
          },
          specialRequirements: 'Outdoor wall',
          materials: ['acrylic paint', 'spray paint'],
        },
        referenceImages: ['https://example.com/ref1.jpg'],
      }

      const mockBooking = {
        id: 'booking-123',
        ...artistBookingDto,
        userId: mockUser.id,
        status: BookingStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      }

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue({
        ...mockProfessional,
        professionalType: ProfessionalType.ARTIST,
      } as any)
      jest.spyOn(bookingRepository, 'create').mockReturnValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue(mockBooking as any)

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }
      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any)

      const result = await service.createBooking(mockUser.id, artistBookingDto)

      expect(result).toEqual(mockBooking)
      expect(result.projectDetails).toBeDefined()
      expect(result.referenceImages).toHaveLength(1)
    })

    it('should throw ConflictException if there is a scheduling conflict', async () => {
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as any)
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue(mockProfessional as any)

      // Mock conflicting booking
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'conflict-booking' }]),
      }
      jest.spyOn(bookingRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any)

      await expect(service.createBooking(mockUser.id, mockBookingDto)).rejects.toThrow(
        ConflictException
      )
    })
  })

  describe('findById', () => {
    it('should return a booking by id', async () => {
      const mockBooking = {
        id: 'booking-123',
        userId: mockUser.id,
        professionalId: mockProfessional.id,
      }

      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(mockBooking as any)

      const result = await service.findById('booking-123')

      expect(result).toEqual(mockBooking)
      expect(bookingRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'booking-123' },
        relations: ['user', 'professional'],
      })
    })

    it('should throw NotFoundException if booking not found', async () => {
      jest.spyOn(bookingRepository, 'findOne').mockResolvedValue(null)

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('updateBookingStatus', () => {
    it('should update booking status from PENDING to CONFIRMED', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.PENDING,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest
        .spyOn(bookingRepository, 'save')
        .mockResolvedValue({ ...mockBooking, status: BookingStatus.CONFIRMED } as any)

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.CONFIRMED,
      })

      expect(result.status).toBe(BookingStatus.CONFIRMED)
    })

    it('should update booking status from CONFIRMED to IN_PROGRESS and set startedAt', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockImplementation(async (booking: any) => {
        return booking
      })

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.IN_PROGRESS,
      })

      expect(result.status).toBe(BookingStatus.IN_PROGRESS)
      expect(result.startedAt).toBeDefined()
    })

    it('should update booking status from IN_PROGRESS to COMPLETED and set completedAt', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.IN_PROGRESS,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockImplementation(async (booking: any) => {
        return booking
      })

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.COMPLETED,
      })

      expect(result.status).toBe(BookingStatus.COMPLETED)
      expect(result.completedAt).toBeDefined()
    })

    it('should handle cancellation with reason', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.PENDING,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockImplementation(async (booking: any) => {
        return booking
      })

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.CANCELLED,
        notes: 'Client requested cancellation',
      })

      expect(result.status).toBe(BookingStatus.CANCELLED)
      expect(result.cancelledAt).toBeDefined()
      expect(result.cancellationReason).toBe('Client requested cancellation')
    })

    it('should add progress photos for artist bookings when updating to IN_PROGRESS', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.ARTIST,
        progressPhotos: [],
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockImplementation(async (booking: any) => {
        return booking
      })

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.IN_PROGRESS,
        progressPhotos: [{ url: 'https://example.com/photo1.jpg', caption: 'Initial sketch' }],
      })

      expect(result.status).toBe(BookingStatus.IN_PROGRESS)
      expect(result.progressPhotos).toBeDefined()
      expect(result.progressPhotos.length).toBeGreaterThan(0)
      expect(result.progressPhotos[0].url).toBe('https://example.com/photo1.jpg')
      expect(result.progressPhotos[0].caption).toBe('Initial sketch')
    })

    it('should reject invalid status transition from PENDING to COMPLETED', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.PENDING,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(
        service.updateBookingStatus('booking-123', {
          status: BookingStatus.COMPLETED,
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject invalid status transition from COMPLETED to IN_PROGRESS', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.COMPLETED,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(
        service.updateBookingStatus('booking-123', {
          status: BookingStatus.IN_PROGRESS,
        })
      ).rejects.toThrow(BadRequestException)
    })

    it('should allow PENDING to REJECTED transition', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.PENDING,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest
        .spyOn(bookingRepository, 'save')
        .mockResolvedValue({ ...mockBooking, status: BookingStatus.REJECTED } as any)

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.REJECTED,
      })

      expect(result.status).toBe(BookingStatus.REJECTED)
    })

    it('should allow CONFIRMED to CANCELLED transition', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockImplementation(async (booking: any) => {
        return booking
      })

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.CANCELLED,
      })

      expect(result.status).toBe(BookingStatus.CANCELLED)
      expect(result.cancelledAt).toBeDefined()
    })

    it('should allow IN_PROGRESS to DISPUTED transition', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.IN_PROGRESS,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest
        .spyOn(bookingRepository, 'save')
        .mockResolvedValue({ ...mockBooking, status: BookingStatus.DISPUTED } as any)

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.DISPUTED,
      })

      expect(result.status).toBe(BookingStatus.DISPUTED)
    })

    it('should allow DISPUTED to RESOLVED transition', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.DISPUTED,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest
        .spyOn(bookingRepository, 'save')
        .mockResolvedValue({ ...mockBooking, status: BookingStatus.RESOLVED } as any)

      const result = await service.updateBookingStatus('booking-123', {
        status: BookingStatus.RESOLVED,
      })

      expect(result.status).toBe(BookingStatus.RESOLVED)
    })
  })

  describe('uploadProgressPhoto', () => {
    it('should upload progress photo for artist booking in IN_PROGRESS status', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.IN_PROGRESS,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.ARTIST,
        progressPhotos: [],
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockImplementation(async (booking: any) => {
        return booking
      })

      const result = await service.uploadProgressPhoto(
        'booking-123',
        'https://example.com/progress.jpg',
        'Work in progress'
      )

      expect(result.progressPhotos).toBeDefined()
      expect(result.progressPhotos.length).toBeGreaterThan(0)
      expect(result.progressPhotos[0].url).toBe('https://example.com/progress.jpg')
      expect(result.progressPhotos[0].caption).toBe('Work in progress')
    })

    it('should reject progress photo upload for non-artist booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.IN_PROGRESS,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.HANDYMAN,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(
        service.uploadProgressPhoto(
          'booking-123',
          'https://example.com/progress.jpg',
          'Work in progress'
        )
      ).rejects.toThrow(BadRequestException)
    })

    it('should reject progress photo upload for booking not in IN_PROGRESS status', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        userId: 'user-123',
        professionalId: 'prof-123',
        professionalType: ProfessionalType.ARTIST,
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(
        service.uploadProgressPhoto(
          'booking-123',
          'https://example.com/progress.jpg',
          'Work in progress'
        )
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('cancelBooking', () => {
    it('should cancel a PENDING booking with reason', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.PENDING,
        userId: 'user-123',
        professionalId: 'prof-123',
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Customer changed their mind',
      } as any)

      const result = await service.cancelBooking('booking-123', 'Customer changed their mind')

      expect(result.status).toBe(BookingStatus.CANCELLED)
      expect(result.cancellationReason).toBe('Customer changed their mind')
      expect(result.cancelledAt).toBeDefined()
    })

    it('should cancel a CONFIRMED booking with reason', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CONFIRMED,
        userId: 'user-123',
        professionalId: 'prof-123',
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)
      jest.spyOn(bookingRepository, 'save').mockResolvedValue({
        ...mockBooking,
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Emergency came up',
      } as any)

      const result = await service.cancelBooking('booking-123', 'Emergency came up')

      expect(result.status).toBe(BookingStatus.CANCELLED)
      expect(result.cancellationReason).toBe('Emergency came up')
      expect(result.cancelledAt).toBeDefined()
    })

    it('should reject cancellation of IN_PROGRESS booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.IN_PROGRESS,
        userId: 'user-123',
        professionalId: 'prof-123',
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(service.cancelBooking('booking-123', 'Want to cancel')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should reject cancellation of COMPLETED booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.COMPLETED,
        userId: 'user-123',
        professionalId: 'prof-123',
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(service.cancelBooking('booking-123', 'Want to cancel')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should reject cancellation of CANCELLED booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.CANCELLED,
        userId: 'user-123',
        professionalId: 'prof-123',
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(service.cancelBooking('booking-123', 'Want to cancel again')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should reject cancellation of REJECTED booking', async () => {
      const mockBooking = {
        id: 'booking-123',
        status: BookingStatus.REJECTED,
        userId: 'user-123',
        professionalId: 'prof-123',
      }

      jest.spyOn(service, 'findById').mockResolvedValue(mockBooking as any)

      await expect(service.cancelBooking('booking-123', 'Want to cancel')).rejects.toThrow(
        BadRequestException
      )
    })

    it('should throw NotFoundException for non-existent booking', async () => {
      jest.spyOn(service, 'findById').mockRejectedValue(new NotFoundException('Booking not found'))

      await expect(service.cancelBooking('non-existent-id', 'Test reason')).rejects.toThrow(
        NotFoundException
      )
    })
  })
})
