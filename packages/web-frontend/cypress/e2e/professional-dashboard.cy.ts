/// <reference types="cypress" />

describe('Professional Dashboard Flow', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      // Login as professional
      cy.login(users.testProfessional.email, users.testProfessional.password)
    })
  })

  describe('Dashboard Overview', () => {
    it('should display professional dashboard', () => {
      cy.mockApiResponse('GET', '**/api/professionals/me', {
        id: 'prof-1',
        firstName: 'John',
        lastName: 'Technician',
        professionalType: 'handyman',
        rating: 4.8,
        totalJobs: 150,
      })
      
      cy.visit('/professional/dashboard')
      
      // Should show dashboard elements
      cy.getByTestId('dashboard-header').should('be.visible')
      cy.getByTestId('professional-stats').should('be.visible')
      cy.getByTestId('recent-bookings').should('be.visible')
    })

    it('should display professional statistics', () => {
      cy.mockApiResponse('GET', '**/api/professionals/me/stats', {
        totalBookings: 150,
        completedBookings: 140,
        pendingBookings: 5,
        cancelledBookings: 5,
        averageRating: 4.8,
        totalEarnings: 45000,
        thisMonthEarnings: 5000,
      })
      
      cy.visit('/professional/dashboard')
      
      // Should show stats
      cy.getByTestId('total-bookings-stat').should('contain', '150')
      cy.getByTestId('completed-bookings-stat').should('contain', '140')
      cy.getByTestId('average-rating-stat').should('contain', '4.8')
      cy.getByTestId('total-earnings-stat').should('contain', '45000')
    })

    it('should display earnings chart', () => {
      cy.mockApiResponse('GET', '**/api/professionals/me/earnings', {
        monthly: [
          { month: 'Enero', earnings: 4000 },
          { month: 'Febrero', earnings: 5000 },
        ],
      })
      
      cy.visit('/professional/dashboard')
      
      // Should show earnings chart
      cy.getByTestId('earnings-chart').should('be.visible')
    })
  })

  describe('Manage Bookings', () => {
    it('should display list of bookings', () => {
      cy.mockApiResponse('GET', '**/api/bookings/professional/*', {
        bookings: [
          {
            id: 'booking-1',
            status: 'pending',
            serviceCategory: 'Electricidad',
            scheduledDate: '2024-02-15T10:00:00Z',
            userName: 'Juan Pérez',
            estimatedPrice: 500,
          },
          {
            id: 'booking-2',
            status: 'confirmed',
            serviceCategory: 'Electricidad',
            scheduledDate: '2024-02-16T14:00:00Z',
            userName: 'María García',
            estimatedPrice: 600,
          },
        ],
        total: 2,
      })
      
      cy.visit('/professional/bookings')
      
      // Should show bookings list
      cy.getByTestId('booking-item').should('have.length', 2)
      cy.contains('Juan Pérez').should('be.visible')
      cy.contains('María García').should('be.visible')
    })

    it('should accept a pending booking', () => {
      const booking = {
        id: 'booking-1',
        status: 'pending',
        serviceCategory: 'Electricidad',
        scheduledDate: '2024-02-15T10:00:00Z',
        userName: 'Juan Pérez',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-1', booking)
      cy.mockApiResponse('POST', '**/api/bookings/booking-1/accept', {
        ...booking,
        status: 'confirmed',
      })
      
      cy.visit('/professional/bookings')
      
      // Click accept button
      cy.getByTestId('booking-item').first().find('[data-testid="accept-button"]').click()
      
      // Should show confirmation modal
      cy.getByTestId('accept-confirmation-modal').should('be.visible')
      
      // Confirm acceptance
      cy.getByTestId('confirm-accept-button').click()
      
      // Should show success message
      cy.contains(/reservación aceptada|booking accepted/i).should('be.visible')
      
      // Status should be updated
      cy.getByTestId('booking-item').first().should('contain', 'confirmed')
    })

    it('should reject a pending booking', () => {
      const booking = {
        id: 'booking-1',
        status: 'pending',
        serviceCategory: 'Electricidad',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-1', booking)
      cy.mockApiResponse('POST', '**/api/bookings/booking-1/reject', {
        ...booking,
        status: 'rejected',
      })
      
      cy.visit('/professional/bookings')
      
      // Click reject button
      cy.getByTestId('booking-item').first().find('[data-testid="reject-button"]').click()
      
      // Should show rejection modal
      cy.getByTestId('reject-modal').should('be.visible')
      
      // Enter rejection reason
      cy.getByTestId('rejection-reason-textarea').type('No disponible en esa fecha')
      
      // Confirm rejection
      cy.getByTestId('confirm-reject-button').click()
      
      // Should show success message
      cy.contains(/reservación rechazada|booking rejected/i).should('be.visible')
    })

    it('should start a confirmed booking', () => {
      const booking = {
        id: 'booking-2',
        status: 'confirmed',
        serviceCategory: 'Electricidad',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-2', booking)
      cy.mockApiResponse('POST', '**/api/bookings/booking-2/start', {
        ...booking,
        status: 'in_progress',
      })
      
      cy.visit('/professional/bookings')
      
      // Click start button
      cy.getByTestId('booking-item').find('[data-testid="start-button"]').first().click()
      
      // Should show confirmation
      cy.getByTestId('start-confirmation-modal').should('be.visible')
      cy.getByTestId('confirm-start-button').click()
      
      // Should update status
      cy.contains(/en progreso|in progress/i).should('be.visible')
    })

    it('should complete a booking', () => {
      const booking = {
        id: 'booking-3',
        status: 'in_progress',
        serviceCategory: 'Electricidad',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-3', booking)
      cy.mockApiResponse('POST', '**/api/bookings/booking-3/complete', {
        ...booking,
        status: 'completed',
      })
      
      cy.visit('/professional/bookings')
      
      // Click complete button
      cy.getByTestId('booking-item').find('[data-testid="complete-button"]').first().click()
      
      // Should show completion form
      cy.getByTestId('completion-modal').should('be.visible')
      
      // Enter completion notes
      cy.getByTestId('completion-notes-textarea').type('Trabajo completado exitosamente')
      
      // Enter actual price if different
      cy.getByTestId('actual-price-input').clear().type('550')
      
      // Confirm completion
      cy.getByTestId('confirm-complete-button').click()
      
      // Should show success message
      cy.contains(/trabajo completado|booking completed/i).should('be.visible')
    })

    it('should filter bookings by status', () => {
      cy.visit('/professional/bookings')
      
      // Filter by pending
      cy.getByTestId('status-filter').select('pending')
      
      // Should show only pending bookings
      cy.getByTestId('booking-item').each(($item) => {
        cy.wrap($item).should('contain', 'pending')
      })
    })
  })

  describe('Artist Progress Photos', () => {
    beforeEach(() => {
      cy.fixture('users').then((users) => {
        // Login as artist
        cy.clearCookies()
        cy.clearLocalStorage()
        cy.login(users.testArtist.email, users.testArtist.password)
      })
    })

    it('should upload progress photos for in-progress booking', () => {
      const booking = {
        id: 'booking-4',
        status: 'in_progress',
        serviceCategory: 'Pintura mural',
        professionalType: 'artist',
      }
      
      cy.mockApiResponse('GET', '**/api/bookings/booking-4', booking)
      cy.mockApiResponse('POST', '**/api/bookings/booking-4/progress-photos', {
        id: 'photo-1',
        url: '/images/progress/photo1.jpg',
        caption: 'Día 1 - Preparación',
      })
      
      cy.visit('/booking/booking-4')
      
      // Should show upload progress photos section
      cy.getByTestId('upload-progress-photo-section').should('be.visible')
      
      // Upload photo
      cy.getByTestId('progress-photo-input').attachFile('progress-photo.jpg')
      
      // Add caption
      cy.getByTestId('photo-caption-input').type('Día 1 - Preparación de la pared')
      
      // Submit
      cy.getByTestId('upload-photo-button').click()
      
      // Should show success message
      cy.contains(/foto subida|photo uploaded/i).should('be.visible')
      
      // Photo should appear in gallery
      cy.getByTestId('progress-photo').should('be.visible')
    })
  })

  describe('Profile Management', () => {
    it('should update professional profile', () => {
      cy.mockApiResponse('GET', '**/api/professionals/me', {
        id: 'prof-1',
        firstName: 'John',
        lastName: 'Technician',
        hourlyRate: 250,
        experienceYears: 5,
      })
      
      cy.mockApiResponse('PUT', '**/api/professionals/me', {
        id: 'prof-1',
        firstName: 'John',
        lastName: 'Technician',
        hourlyRate: 300,
        experienceYears: 5,
      })
      
      cy.visit('/professional/profile')
      
      // Update hourly rate
      cy.getByTestId('hourly-rate-input').clear().type('300')
      
      // Save changes
      cy.getByTestId('save-profile-button').click()
      
      // Should show success message
      cy.contains(/perfil actualizado|profile updated/i).should('be.visible')
    })

    it('should update availability status', () => {
      cy.mockApiResponse('GET', '**/api/professionals/me', {
        id: 'prof-1',
        isAvailable: true,
      })
      
      cy.mockApiResponse('PUT', '**/api/professionals/me/availability', {
        isAvailable: false,
      })
      
      cy.visit('/professional/profile')
      
      // Toggle availability
      cy.getByTestId('availability-toggle').click()
      
      // Should show confirmation
      cy.contains(/disponibilidad actualizada|availability updated/i).should('be.visible')
    })

    it('should update working hours', () => {
      cy.visit('/professional/profile')
      
      // Click edit working hours
      cy.getByTestId('edit-working-hours-button').click()
      
      // Should show working hours form
      cy.getByTestId('working-hours-form').should('be.visible')
      
      // Update Monday hours
      cy.getByTestId('monday-start-time').type('08:00')
      cy.getByTestId('monday-end-time').type('18:00')
      
      // Save
      cy.getByTestId('save-working-hours-button').click()
      
      // Should show success message
      cy.contains(/horario actualizado|schedule updated/i).should('be.visible')
    })
  })

  describe('Artist Portfolio Management', () => {
    beforeEach(() => {
      cy.fixture('users').then((users) => {
        cy.clearCookies()
        cy.clearLocalStorage()
        cy.login(users.testArtist.email, users.testArtist.password)
      })
    })

    it('should upload portfolio image', () => {
      cy.mockApiResponse('POST', '**/api/professionals/me/portfolio', {
        id: 'port-1',
        imageUrl: '/images/portfolio/image1.jpg',
        title: 'Mural Moderno',
      })
      
      cy.visit('/professional/profile')
      
      // Navigate to portfolio section
      cy.getByTestId('portfolio-tab').click()
      
      // Upload image
      cy.getByTestId('portfolio-upload-input').attachFile('portfolio-image.jpg')
      
      // Fill metadata
      cy.getByTestId('portfolio-title-input').type('Mural Moderno')
      cy.getByTestId('portfolio-description-textarea').type('Mural abstracto en oficina corporativa')
      cy.getByTestId('portfolio-category-select').select('Pintura mural')
      
      // Submit
      cy.getByTestId('upload-portfolio-button').click()
      
      // Should show success message
      cy.contains(/imagen agregada|image added/i).should('be.visible')
    })

    it('should delete portfolio image', () => {
      cy.mockApiResponse('GET', '**/api/professionals/me/portfolio', [
        {
          id: 'port-1',
          imageUrl: '/images/portfolio/image1.jpg',
          title: 'Mural Moderno',
        },
      ])
      
      cy.mockApiResponse('DELETE', '**/api/professionals/me/portfolio/port-1', {
        success: true,
      })
      
      cy.visit('/professional/profile')
      cy.getByTestId('portfolio-tab').click()
      
      // Click delete button
      cy.getByTestId('portfolio-item').first().find('[data-testid="delete-portfolio-button"]').click()
      
      // Confirm deletion
      cy.getByTestId('confirm-delete-button').click()
      
      // Should show success message
      cy.contains(/imagen eliminada|image deleted/i).should('be.visible')
    })
  })

  describe('Earnings and Payouts', () => {
    it('should display earnings summary', () => {
      cy.mockApiResponse('GET', '**/api/payment/professional/balance', {
        available: 5000,
        pending: 2000,
        currency: 'MXN',
      })
      
      cy.visit('/professional/earnings')
      
      // Should show balance
      cy.getByTestId('available-balance').should('contain', '5000')
      cy.getByTestId('pending-balance').should('contain', '2000')
    })

    it('should request payout', () => {
      cy.mockApiResponse('GET', '**/api/payment/professional/balance', {
        available: 5000,
        pending: 0,
      })
      
      cy.mockApiResponse('POST', '**/api/payment/payout', {
        id: 'payout-1',
        amount: 3000,
        status: 'pending',
      })
      
      cy.visit('/professional/earnings')
      
      // Click request payout
      cy.getByTestId('request-payout-button').click()
      
      // Enter amount
      cy.getByTestId('payout-amount-input').type('3000')
      
      // Submit
      cy.getByTestId('submit-payout-button').click()
      
      // Should show success message
      cy.contains(/retiro solicitado|payout requested/i).should('be.visible')
    })
  })
})
