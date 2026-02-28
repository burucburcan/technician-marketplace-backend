/// <reference types="cypress" />

describe('Admin Flow', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      // Login as admin
      cy.login(users.testAdmin.email, users.testAdmin.password)
    })
  })

  describe('Admin Dashboard', () => {
    it('should display admin dashboard with statistics', () => {
      cy.mockApiResponse('GET', '**/api/admin/stats', {
        totalUsers: 1500,
        totalProfessionals: 250,
        totalBookings: 3000,
        totalRevenue: 150000,
        activeBookings: 45,
        pendingVerifications: 12,
      })
      
      cy.visit('/admin/dashboard')
      
      // Should show dashboard
      cy.getByTestId('admin-dashboard').should('be.visible')
      
      // Should show statistics
      cy.getByTestId('total-users-stat').should('contain', '1500')
      cy.getByTestId('total-professionals-stat').should('contain', '250')
      cy.getByTestId('total-bookings-stat').should('contain', '3000')
      cy.getByTestId('total-revenue-stat').should('contain', '150000')
    })

    it('should display charts and graphs', () => {
      cy.mockApiResponse('GET', '**/api/admin/stats/charts', {
        bookingsByMonth: [],
        revenueByMonth: [],
        userGrowth: [],
      })
      
      cy.visit('/admin/dashboard')
      
      // Should show charts
      cy.getByTestId('bookings-chart').should('be.visible')
      cy.getByTestId('revenue-chart').should('be.visible')
    })
  })

  describe('Manage Users', () => {
    it('should display list of users', () => {
      cy.mockApiResponse('GET', '**/api/admin/users*', {
        users: [
          {
            id: 'user-1',
            firstName: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com',
            role: 'user',
            isActive: true,
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'user-2',
            firstName: 'María',
            lastName: 'García',
            email: 'maria@example.com',
            role: 'user',
            isActive: true,
            createdAt: '2024-01-20T14:00:00Z',
          },
        ],
        total: 2,
      })
      
      cy.visit('/admin/users')
      
      // Should show users list
      cy.getByTestId('user-item').should('have.length', 2)
      cy.contains('Juan Pérez').should('be.visible')
      cy.contains('María García').should('be.visible')
    })

    it('should search users by name or email', () => {
      cy.visit('/admin/users')
      
      // Search by name
      cy.getByTestId('search-input').type('Juan')
      cy.getByTestId('search-button').click()
      
      // Should filter results
      cy.getByTestId('user-item').should('contain', 'Juan')
    })

    it('should suspend a user account', () => {
      cy.mockApiResponse('GET', '**/api/admin/users*', {
        users: [
          {
            id: 'user-1',
            firstName: 'Juan',
            lastName: 'Pérez',
            email: 'juan@example.com',
            isActive: true,
          },
        ],
        total: 1,
      })
      
      cy.mockApiResponse('POST', '**/api/admin/users/user-1/suspend', {
        id: 'user-1',
        isActive: false,
      })
      
      cy.visit('/admin/users')
      
      // Click suspend button
      cy.getByTestId('user-item').first().find('[data-testid="suspend-button"]').click()
      
      // Should show confirmation modal
      cy.getByTestId('suspend-confirmation-modal').should('be.visible')
      
      // Enter reason
      cy.getByTestId('suspend-reason-textarea').type('Violación de términos de servicio')
      
      // Confirm suspension
      cy.getByTestId('confirm-suspend-button').click()
      
      // Should show success message
      cy.contains(/usuario suspendido|user suspended/i).should('be.visible')
    })

    it('should delete a user account', () => {
      cy.mockApiResponse('DELETE', '**/api/admin/users/user-1', {
        success: true,
      })
      
      cy.visit('/admin/users')
      
      // Click delete button
      cy.getByTestId('user-item').first().find('[data-testid="delete-button"]').click()
      
      // Should show confirmation modal
      cy.getByTestId('delete-confirmation-modal').should('be.visible')
      cy.contains(/esta acción no se puede deshacer|this action cannot be undone/i).should('be.visible')
      
      // Confirm deletion
      cy.getByTestId('confirm-delete-button').click()
      
      // Should show success message
      cy.contains(/usuario eliminado|user deleted/i).should('be.visible')
    })

    it('should view user details', () => {
      cy.mockApiResponse('GET', '**/api/admin/users/user-1', {
        id: 'user-1',
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        phone: '+52 55 1234 5678',
        role: 'user',
        isActive: true,
        createdAt: '2024-01-15T10:00:00Z',
        totalBookings: 15,
        totalSpent: 7500,
      })
      
      cy.visit('/admin/users')
      
      // Click on user
      cy.getByTestId('user-item').first().click()
      
      // Should navigate to user details
      cy.url().should('include', '/admin/users/user-1')
      
      // Should show user details
      cy.getByTestId('user-email').should('contain', 'juan@example.com')
      cy.getByTestId('user-phone').should('contain', '+52 55 1234 5678')
      cy.getByTestId('total-bookings').should('contain', '15')
    })
  })

  describe('Manage Professionals', () => {
    it('should display list of professionals', () => {
      cy.mockApiResponse('GET', '**/api/admin/professionals*', {
        professionals: [
          {
            id: 'prof-1',
            firstName: 'Carlos',
            lastName: 'Electricista',
            professionalType: 'handyman',
            specializations: ['Electricidad'],
            verificationStatus: 'verified',
            rating: 4.8,
          },
          {
            id: 'artist-1',
            firstName: 'Diego',
            lastName: 'Muralista',
            professionalType: 'artist',
            specializations: ['Pintura mural'],
            verificationStatus: 'pending',
            rating: 4.9,
          },
        ],
        total: 2,
      })
      
      cy.visit('/admin/professionals')
      
      // Should show professionals list
      cy.getByTestId('professional-item').should('have.length', 2)
      cy.contains('Carlos Electricista').should('be.visible')
      cy.contains('Diego Muralista').should('be.visible')
    })

    it('should filter professionals by type', () => {
      cy.visit('/admin/professionals')
      
      // Filter by artist
      cy.getByTestId('professional-type-filter').select('artist')
      
      // Should show only artists
      cy.getByTestId('professional-item').each(($item) => {
        cy.wrap($item).should('contain', 'artist')
      })
    })

    it('should verify a professional', () => {
      cy.mockApiResponse('POST', '**/api/admin/professionals/prof-1/verify', {
        id: 'prof-1',
        verificationStatus: 'verified',
      })
      
      cy.visit('/admin/professionals')
      
      // Click verify button
      cy.getByTestId('professional-item').find('[data-testid="verify-button"]').first().click()
      
      // Should show confirmation
      cy.getByTestId('verify-confirmation-modal').should('be.visible')
      
      // Confirm verification
      cy.getByTestId('confirm-verify-button').click()
      
      // Should show success message
      cy.contains(/profesional verificado|professional verified/i).should('be.visible')
    })

    it('should reject a professional verification', () => {
      cy.mockApiResponse('POST', '**/api/admin/professionals/prof-1/reject', {
        id: 'prof-1',
        verificationStatus: 'rejected',
      })
      
      cy.visit('/admin/professionals')
      
      // Click reject button
      cy.getByTestId('professional-item').find('[data-testid="reject-button"]').first().click()
      
      // Should show rejection modal
      cy.getByTestId('reject-modal').should('be.visible')
      
      // Enter rejection reason
      cy.getByTestId('rejection-reason-textarea').type('Documentos incompletos')
      
      // Confirm rejection
      cy.getByTestId('confirm-reject-button').click()
      
      // Should show success message
      cy.contains(/verificación rechazada|verification rejected/i).should('be.visible')
    })

    it('should review artist portfolio', () => {
      cy.mockApiResponse('GET', '**/api/admin/professionals/artist-1', {
        id: 'artist-1',
        firstName: 'Diego',
        professionalType: 'artist',
        portfolio: [
          {
            id: 'port-1',
            imageUrl: '/images/portfolio/mural1.jpg',
            title: 'Mural Histórico',
          },
        ],
      })
      
      cy.visit('/admin/professionals')
      
      // Click on artist
      cy.getByTestId('professional-item').contains('artist').click()
      
      // Should show portfolio section
      cy.getByTestId('portfolio-section').should('be.visible')
      cy.getByTestId('portfolio-item').should('have.length.at.least', 1)
    })
  })

  describe('Manage Categories', () => {
    it('should display list of categories', () => {
      cy.mockApiResponse('GET', '**/api/admin/categories', {
        categories: [
          {
            id: 'cat-1',
            name: 'Electricidad',
            type: 'technical',
            isActive: true,
            professionalCount: 45,
          },
          {
            id: 'cat-2',
            name: 'Pintura mural',
            type: 'artistic',
            isActive: true,
            professionalCount: 12,
          },
        ],
        total: 2,
      })
      
      cy.visit('/admin/categories')
      
      // Should show categories list
      cy.getByTestId('category-item').should('have.length', 2)
      cy.contains('Electricidad').should('be.visible')
      cy.contains('Pintura mural').should('be.visible')
    })

    it('should create a new category', () => {
      cy.mockApiResponse('POST', '**/api/admin/categories', {
        id: 'cat-3',
        name: 'Carpintería',
        type: 'technical',
        isActive: true,
      })
      
      cy.visit('/admin/categories')
      
      // Click add category button
      cy.getByTestId('add-category-button').click()
      
      // Should show category form
      cy.getByTestId('category-form').should('be.visible')
      
      // Fill form
      cy.getByTestId('category-name-input').type('Carpintería')
      cy.getByTestId('category-type-select').select('technical')
      cy.getByTestId('category-name-es-input').type('Carpintería')
      cy.getByTestId('category-name-en-input').type('Carpentry')
      
      // Submit
      cy.getByTestId('submit-category-button').click()
      
      // Should show success message
      cy.contains(/categoría creada|category created/i).should('be.visible')
    })

    it('should edit a category', () => {
      cy.mockApiResponse('GET', '**/api/admin/categories/cat-1', {
        id: 'cat-1',
        name: 'Electricidad',
        type: 'technical',
      })
      
      cy.mockApiResponse('PUT', '**/api/admin/categories/cat-1', {
        id: 'cat-1',
        name: 'Electricidad y Electrónica',
        type: 'technical',
      })
      
      cy.visit('/admin/categories')
      
      // Click edit button
      cy.getByTestId('category-item').first().find('[data-testid="edit-button"]').click()
      
      // Update name
      cy.getByTestId('category-name-input').clear().type('Electricidad y Electrónica')
      
      // Save
      cy.getByTestId('submit-category-button').click()
      
      // Should show success message
      cy.contains(/categoría actualizada|category updated/i).should('be.visible')
    })

    it('should delete a category', () => {
      cy.mockApiResponse('DELETE', '**/api/admin/categories/cat-1', {
        success: true,
      })
      
      cy.visit('/admin/categories')
      
      // Click delete button
      cy.getByTestId('category-item').first().find('[data-testid="delete-button"]').click()
      
      // Should show confirmation
      cy.getByTestId('delete-confirmation-modal').should('be.visible')
      
      // Confirm deletion
      cy.getByTestId('confirm-delete-button').click()
      
      // Should show success message
      cy.contains(/categoría eliminada|category deleted/i).should('be.visible')
    })
  })

  describe('Manage Disputes', () => {
    it('should display list of disputes', () => {
      cy.mockApiResponse('GET', '**/api/admin/disputes*', {
        disputes: [
          {
            id: 'dispute-1',
            bookingId: 'booking-1',
            reportedBy: 'user-1',
            issueType: 'poor_quality',
            status: 'pending',
            createdAt: '2024-02-01T10:00:00Z',
          },
        ],
        total: 1,
      })
      
      cy.visit('/admin/disputes')
      
      // Should show disputes list
      cy.getByTestId('dispute-item').should('have.length', 1)
    })

    it('should resolve a dispute', () => {
      cy.mockApiResponse('GET', '**/api/admin/disputes/dispute-1', {
        id: 'dispute-1',
        bookingId: 'booking-1',
        issueType: 'poor_quality',
        description: 'Trabajo mal realizado',
        status: 'pending',
      })
      
      cy.mockApiResponse('POST', '**/api/admin/disputes/dispute-1/resolve', {
        id: 'dispute-1',
        status: 'resolved',
      })
      
      cy.visit('/admin/disputes')
      
      // Click on dispute
      cy.getByTestId('dispute-item').first().click()
      
      // Should show dispute details
      cy.getByTestId('dispute-details').should('be.visible')
      
      // Enter resolution
      cy.getByTestId('resolution-textarea').type('Reembolso parcial aprobado')
      
      // Resolve
      cy.getByTestId('resolve-button').click()
      
      // Should show success message
      cy.contains(/disputa resuelta|dispute resolved/i).should('be.visible')
    })
  })

  describe('Platform Settings', () => {
    it('should update platform settings', () => {
      cy.mockApiResponse('GET', '**/api/admin/settings', {
        platformFeePercentage: 15,
        minBookingPrice: 100,
        maxSearchRadius: 50,
      })
      
      cy.mockApiResponse('PUT', '**/api/admin/settings', {
        platformFeePercentage: 18,
        minBookingPrice: 100,
        maxSearchRadius: 50,
      })
      
      cy.visit('/admin/settings')
      
      // Update platform fee
      cy.getByTestId('platform-fee-input').clear().type('18')
      
      // Save
      cy.getByTestId('save-settings-button').click()
      
      // Should show success message
      cy.contains(/configuración actualizada|settings updated/i).should('be.visible')
    })
  })

  describe('Reports and Analytics', () => {
    it('should generate revenue report', () => {
      cy.mockApiResponse('GET', '**/api/admin/reports/revenue*', {
        totalRevenue: 150000,
        platformFees: 22500,
        professionalPayouts: 127500,
        byMonth: [],
      })
      
      cy.visit('/admin/reports')
      
      // Select revenue report
      cy.getByTestId('report-type-select').select('revenue')
      
      // Set date range
      cy.getByTestId('start-date-input').type('2024-01-01')
      cy.getByTestId('end-date-input').type('2024-12-31')
      
      // Generate report
      cy.getByTestId('generate-report-button').click()
      
      // Should show report
      cy.getByTestId('report-results').should('be.visible')
      cy.getByTestId('total-revenue').should('contain', '150000')
    })

    it('should export report to CSV', () => {
      cy.visit('/admin/reports')
      
      cy.getByTestId('report-type-select').select('bookings')
      cy.getByTestId('generate-report-button').click()
      
      // Click export button
      cy.getByTestId('export-csv-button').click()
      
      // Should trigger download (verified by button click)
    })
  })
})
