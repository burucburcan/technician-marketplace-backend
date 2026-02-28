/// <reference types="cypress" />

describe('Booking Flow', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      cy.login(users.testUser.email, users.testUser.password)
    })
  })

  describe('Create Booking', () => {
    it('should create a booking for a technician', () => {
      cy.fixture('professionals').then((professionals) => {
        cy.fixture('bookings').then((bookings) => {
          const professional = professionals.professionals[0]
          const booking = bookings.testBooking
          
          cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
          
          cy.visit(`/professional/${professional.id}`)
          
          // Click book now button
          cy.getByTestId('book-now-button').click()
          
          // Should show booking form
          cy.getByTestId('booking-form').should('be.visible')
          
          // Fill booking form
          cy.getByTestId('service-category-select').select(booking.serviceCategory)
          cy.getByTestId('date-input').type('2024-02-15')
          cy.getByTestId('time-input').type('10:00')
          cy.getByTestId('duration-input').type('120')
          cy.getByTestId('address-input').type(booking.serviceAddress.address)
          cy.getByTestId('city-input').type(booking.serviceAddress.city)
          cy.getByTestId('description-textarea').type(booking.description)
          
          // Mock booking creation
          cy.mockApiResponse('POST', '**/api/bookings', {
            id: 'booking-123',
            ...booking,
            status: 'pending',
          })
          
          // Submit booking
          cy.getByTestId('submit-booking-button').click()
          
          // Should show success message
          cy.contains(/reservación creada|booking created/i).should('be.visible')
          
          // Should redirect to booking details
          cy.url().should('include', '/booking/')
        })
      })
    })

    it('should create a booking for an artist with project details', () => {
      cy.fixture('professionals').then((professionals) => {
        cy.fixture('bookings').then((bookings) => {
          const artist = professionals.professionals.find(p => p.professionalType === 'artist')
          const booking = bookings.artistBooking
          
          cy.mockApiResponse('GET', `**/api/professionals/${artist.id}`, artist)
          
          cy.visit(`/professional/${artist.id}`)
          
          cy.getByTestId('book-now-button').click()
          
          // Should show project details section for artists
          cy.getByTestId('project-details-section').should('be.visible')
          
          // Fill booking form with project details
          cy.getByTestId('service-category-select').select(booking.serviceCategory)
          cy.getByTestId('date-input').type('2024-02-20')
          cy.getByTestId('time-input').type('09:00')
          cy.getByTestId('address-input').type(booking.serviceAddress.address)
          cy.getByTestId('description-textarea').type(booking.description)
          
          // Fill project details
          cy.getByTestId('project-type-input').type(booking.projectDetails.projectType)
          cy.getByTestId('estimated-duration-input').type(booking.projectDetails.estimatedDuration)
          cy.getByTestId('min-price-input').type(booking.projectDetails.priceRange.min.toString())
          cy.getByTestId('max-price-input').type(booking.projectDetails.priceRange.max.toString())
          
          // Upload reference images
          cy.getByTestId('reference-images-input').attachFile('reference-image.jpg')
          
          cy.mockApiResponse('POST', '**/api/bookings', {
            id: 'booking-456',
            ...booking,
            status: 'pending',
          })
          
          cy.getByTestId('submit-booking-button').click()
          
          cy.contains(/reservación creada|booking created/i).should('be.visible')
        })
      })
    })

    it('should show validation errors for incomplete form', () => {
      cy.fixture('professionals').then((professionals) => {
        const professional = professionals.professionals[0]
        
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
        
        cy.visit(`/professional/${professional.id}`)
        cy.getByTestId('book-now-button').click()
        
        // Try to submit empty form
        cy.getByTestId('submit-booking-button').click()
        
        // Should show validation errors
        cy.contains(/requerido|required/i).should('be.visible')
      })
    })

    it('should prevent booking on unavailable time slots', () => {
      cy.fixture('professionals').then((professionals) => {
        const professional = professionals.professionals[0]
        
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}/availability*`, {
          availableSlots: [],
        })
        
        cy.visit(`/professional/${professional.id}`)
        cy.getByTestId('book-now-button').click()
        
        // Select unavailable date
        cy.getByTestId('date-input').type('2024-02-15')
        
        // Should show no available slots message
        cy.contains(/no hay horarios disponibles|no available slots/i).should('be.visible')
      })
    })
  })

  describe('View Booking Details', () => {
    it('should display booking information', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'confirmed',
          professionalName: 'Carlos Electricista',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        
        cy.visit('/booking/booking-123')
        
        // Should show booking details
        cy.getByTestId('booking-status').should('contain', 'confirmed')
        cy.getByTestId('professional-name').should('contain', booking.professionalName)
        cy.getByTestId('service-category').should('contain', booking.serviceCategory)
        cy.getByTestId('service-address').should('contain', booking.serviceAddress.address)
        cy.getByTestId('booking-description').should('contain', booking.description)
      })
    })

    it('should display progress photos for artist bookings', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-456',
          ...bookings.artistBooking,
          status: 'in_progress',
          progressPhotos: [
            {
              id: 'photo-1',
              url: '/images/progress/photo1.jpg',
              caption: 'Día 1 - Preparación',
              uploadedAt: '2024-02-20T10:00:00Z',
            },
          ],
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-456', booking)
        
        cy.visit('/booking/booking-456')
        
        // Should show progress photos section
        cy.getByTestId('progress-photos-section').should('be.visible')
        cy.getByTestId('progress-photo').should('have.length', 1)
        cy.contains('Día 1 - Preparación').should('be.visible')
      })
    })

    it('should show messaging panel', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'confirmed',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        cy.mockApiResponse('GET', '**/api/messages/booking-123', {
          messages: [],
        })
        
        cy.visit('/booking/booking-123')
        
        // Should show messaging panel
        cy.getByTestId('messaging-panel').should('be.visible')
        cy.getByTestId('message-input').should('be.visible')
        cy.getByTestId('send-message-button').should('be.visible')
      })
    })

    it('should send a message to professional', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'confirmed',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        cy.mockApiResponse('GET', '**/api/messages/booking-123', {
          messages: [],
        })
        cy.mockApiResponse('POST', '**/api/messages', {
          id: 'msg-1',
          content: 'Hola, ¿a qué hora llegará?',
          senderId: 'user-1',
          createdAt: new Date().toISOString(),
        })
        
        cy.visit('/booking/booking-123')
        
        // Type and send message
        cy.getByTestId('message-input').type('Hola, ¿a qué hora llegará?')
        cy.getByTestId('send-message-button').click()
        
        // Should show message in chat
        cy.contains('Hola, ¿a qué hora llegará?').should('be.visible')
      })
    })
  })

  describe('Cancel Booking', () => {
    it('should cancel a pending booking', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'pending',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        cy.mockApiResponse('POST', '**/api/bookings/booking-123/cancel', {
          ...booking,
          status: 'cancelled',
        })
        
        cy.visit('/booking/booking-123')
        
        // Click cancel button
        cy.getByTestId('cancel-booking-button').click()
        
        // Should show confirmation modal
        cy.getByTestId('cancel-confirmation-modal').should('be.visible')
        
        // Enter cancellation reason
        cy.getByTestId('cancellation-reason-textarea').type('Cambio de planes')
        
        // Confirm cancellation
        cy.getByTestId('confirm-cancel-button').click()
        
        // Should show success message
        cy.contains(/reservación cancelada|booking cancelled/i).should('be.visible')
        
        // Status should be updated
        cy.getByTestId('booking-status').should('contain', 'cancelled')
      })
    })

    it('should not allow cancelling completed bookings', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'completed',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        
        cy.visit('/booking/booking-123')
        
        // Cancel button should not be visible
        cy.getByTestId('cancel-booking-button').should('not.exist')
      })
    })
  })

  describe('Rate Booking', () => {
    it('should submit rating for completed booking', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'completed',
          professionalId: 'prof-1',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        cy.mockApiResponse('POST', '**/api/ratings', {
          id: 'rating-1',
          bookingId: booking.id,
          score: 5,
          comment: 'Excelente trabajo',
        })
        
        cy.visit('/booking/booking-123')
        
        // Should show rating form
        cy.getByTestId('rating-form').should('be.visible')
        
        // Select rating
        cy.getByTestId('rating-stars').find('[data-value="5"]').click()
        
        // Enter comment
        cy.getByTestId('rating-comment-textarea').type('Excelente trabajo, muy profesional')
        
        // Submit rating
        cy.getByTestId('submit-rating-button').click()
        
        // Should show success message
        cy.contains(/calificación enviada|rating submitted/i).should('be.visible')
      })
    })

    it('should not allow rating non-completed bookings', () => {
      cy.fixture('bookings').then((bookings) => {
        const booking = {
          id: 'booking-123',
          ...bookings.testBooking,
          status: 'confirmed',
        }
        
        cy.mockApiResponse('GET', '**/api/bookings/booking-123', booking)
        
        cy.visit('/booking/booking-123')
        
        // Rating form should not be visible
        cy.getByTestId('rating-form').should('not.exist')
      })
    })
  })

  describe('User Bookings List', () => {
    it('should display list of user bookings', () => {
      cy.mockApiResponse('GET', '**/api/bookings/user/*', {
        bookings: [
          {
            id: 'booking-1',
            serviceCategory: 'Electricidad',
            status: 'confirmed',
            scheduledDate: '2024-02-15T10:00:00Z',
            professionalName: 'Carlos Electricista',
          },
          {
            id: 'booking-2',
            serviceCategory: 'Plomería',
            status: 'pending',
            scheduledDate: '2024-02-20T14:00:00Z',
            professionalName: 'Ana Plomera',
          },
        ],
        total: 2,
      })
      
      cy.visit('/user/bookings')
      
      // Should show bookings list
      cy.getByTestId('booking-item').should('have.length', 2)
      cy.contains('Electricidad').should('be.visible')
      cy.contains('Plomería').should('be.visible')
    })

    it('should filter bookings by status', () => {
      cy.mockApiResponse('GET', '**/api/bookings/user/*', {
        bookings: [
          {
            id: 'booking-1',
            status: 'confirmed',
            serviceCategory: 'Electricidad',
          },
        ],
        total: 1,
      })
      
      cy.visit('/user/bookings')
      
      // Filter by confirmed
      cy.getByTestId('status-filter').select('confirmed')
      
      // Should show only confirmed bookings
      cy.getByTestId('booking-item').should('have.length', 1)
      cy.getByTestId('booking-status').should('contain', 'confirmed')
    })

    it('should navigate to booking details when clicking item', () => {
      cy.mockApiResponse('GET', '**/api/bookings/user/*', {
        bookings: [
          {
            id: 'booking-1',
            serviceCategory: 'Electricidad',
            status: 'confirmed',
          },
        ],
        total: 1,
      })
      
      cy.visit('/user/bookings')
      
      // Click on booking item
      cy.getByTestId('booking-item').first().click()
      
      // Should navigate to booking details
      cy.url().should('include', '/booking/booking-1')
    })
  })
})
