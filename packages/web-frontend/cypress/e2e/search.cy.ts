/// <reference types="cypress" />

describe('Professional Search Flow', () => {
  beforeEach(() => {
    cy.fixture('users').then((users) => {
      // Login before each test
      cy.login(users.testUser.email, users.testUser.password)
    })
  })

  describe('Search Professionals', () => {
    it('should display search form on home page', () => {
      cy.visit('/')
      
      // Should show search form
      cy.getByTestId('search-form').should('be.visible')
      cy.getByTestId('category-select').should('be.visible')
      cy.getByTestId('location-input').should('be.visible')
      cy.getByTestId('search-button').should('be.visible')
    })

    it('should search professionals by category', () => {
      cy.fixture('professionals').then((data) => {
        // Mock API response
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: data.professionals.filter(p => p.professionalType === 'handyman'),
          total: 2,
        })
        
        cy.visit('/')
        
        // Select category
        cy.getByTestId('category-select').select('Electricidad')
        cy.getByTestId('search-button').click()
        
        // Should show results
        cy.getByTestId('search-results').should('be.visible')
        cy.getByTestId('professional-card').should('have.length.at.least', 1)
        
        // Results should contain electricians
        cy.contains('Electricidad').should('be.visible')
      })
    })

    it('should filter by professional type (technician/artist)', () => {
      cy.fixture('professionals').then((data) => {
        // Mock API response for artists
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: data.professionals.filter(p => p.professionalType === 'artist'),
          total: 1,
        })
        
        cy.visit('/search')
        
        // Filter by artist
        cy.getByTestId('professional-type-filter').select('artist')
        
        // Should show only artists
        cy.getByTestId('professional-card').should('have.length', 1)
        cy.contains('Muralista').should('be.visible')
      })
    })

    it('should display portfolio preview for artists', () => {
      cy.fixture('professionals').then((data) => {
        const artist = data.professionals.find(p => p.professionalType === 'artist')
        
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: [artist],
          total: 1,
        })
        
        cy.visit('/search?type=artist')
        
        // Should show portfolio preview
        cy.getByTestId('portfolio-preview').should('be.visible')
        cy.getByTestId('portfolio-image').should('have.length.at.least', 1)
      })
    })

    it('should sort results by rating', () => {
      cy.fixture('professionals').then((data) => {
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: data.professionals,
          total: data.professionals.length,
        })
        
        cy.visit('/search')
        
        // Sort by rating
        cy.getByTestId('sort-select').select('rating')
        
        // Should be sorted by rating (descending)
        cy.getByTestId('professional-card').first().should('contain', '4.9')
      })
    })

    it('should sort results by distance', () => {
      cy.visit('/search')
      
      // Sort by distance
      cy.getByTestId('sort-select').select('distance')
      
      // Should show distance information
      cy.getByTestId('professional-card').first().should('contain', 'km')
    })

    it('should filter by price range', () => {
      cy.visit('/search')
      
      // Set price range
      cy.getByTestId('min-price-input').type('200')
      cy.getByTestId('max-price-input').type('300')
      cy.getByTestId('apply-filters-button').click()
      
      // Should show filtered results
      cy.getByTestId('professional-card').each(($card) => {
        cy.wrap($card).should('contain', /\$2[0-9]{2}|\$300/)
      })
    })

    it('should show no results message when no professionals found', () => {
      cy.mockApiResponse('GET', '**/api/professionals/search*', {
        professionals: [],
        total: 0,
      })
      
      cy.visit('/search?category=NonExistentCategory')
      
      // Should show no results message
      cy.contains(/no se encontraron|no professionals found/i).should('be.visible')
    })
  })

  describe('View Professional Profile', () => {
    it('should navigate to professional profile when clicking card', () => {
      cy.fixture('professionals').then((data) => {
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: data.professionals,
          total: data.professionals.length,
        })
        
        cy.mockApiResponse('GET', '**/api/professionals/prof-1', data.professionals[0])
        
        cy.visit('/search')
        
        // Click on first professional card
        cy.getByTestId('professional-card').first().click()
        
        // Should navigate to profile page
        cy.url().should('include', '/professional/')
        
        // Should show professional details
        cy.getByTestId('professional-name').should('be.visible')
        cy.getByTestId('professional-rating').should('be.visible')
        cy.getByTestId('professional-experience').should('be.visible')
      })
    })

    it('should display professional specializations', () => {
      cy.fixture('professionals').then((data) => {
        const professional = data.professionals[0]
        
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
        
        cy.visit(`/professional/${professional.id}`)
        
        // Should show specializations
        professional.specializations.forEach((spec: string) => {
          cy.contains(spec).should('be.visible')
        })
      })
    })

    it('should display artist portfolio in full view', () => {
      cy.fixture('professionals').then((data) => {
        const artist = data.professionals.find(p => p.professionalType === 'artist')
        
        cy.mockApiResponse('GET', `**/api/professionals/${artist.id}`, artist)
        
        cy.visit(`/professional/${artist.id}`)
        
        // Should show portfolio section
        cy.getByTestId('portfolio-section').should('be.visible')
        cy.getByTestId('portfolio-item').should('have.length.at.least', 1)
        
        // Click on portfolio item to view full size
        cy.getByTestId('portfolio-item').first().click()
        cy.getByTestId('portfolio-modal').should('be.visible')
      })
    })

    it('should display professional ratings and reviews', () => {
      cy.fixture('professionals').then((data) => {
        const professional = data.professionals[0]
        
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
        cy.mockApiResponse('GET', `**/api/ratings/professional/${professional.id}`, {
          ratings: [
            {
              id: 'rating-1',
              score: 5,
              comment: 'Excelente servicio',
              userName: 'Juan Pérez',
              createdAt: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
        })
        
        cy.visit(`/professional/${professional.id}`)
        
        // Should show ratings section
        cy.getByTestId('ratings-section').should('be.visible')
        cy.getByTestId('rating-item').should('have.length.at.least', 1)
        cy.contains('Excelente servicio').should('be.visible')
      })
    })

    it('should show availability calendar', () => {
      cy.fixture('professionals').then((data) => {
        const professional = data.professionals[0]
        
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
        
        cy.visit(`/professional/${professional.id}`)
        
        // Should show availability calendar
        cy.getByTestId('availability-calendar').should('be.visible')
      })
    })

    it('should have book now button', () => {
      cy.fixture('professionals').then((data) => {
        const professional = data.professionals[0]
        
        cy.mockApiResponse('GET', `**/api/professionals/${professional.id}`, professional)
        
        cy.visit(`/professional/${professional.id}`)
        
        // Should show book button
        cy.getByTestId('book-now-button').should('be.visible')
      })
    })
  })

  describe('Map View', () => {
    it('should display professionals on map', () => {
      cy.fixture('professionals').then((data) => {
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: data.professionals,
          total: data.professionals.length,
        })
        
        cy.visit('/search')
        
        // Switch to map view
        cy.getByTestId('map-view-toggle').click()
        
        // Should show map
        cy.getByTestId('map-container').should('be.visible')
        
        // Should show markers
        cy.getByTestId('map-marker').should('have.length.at.least', 1)
      })
    })

    it('should show professional info when clicking marker', () => {
      cy.fixture('professionals').then((data) => {
        cy.mockApiResponse('GET', '**/api/professionals/search*', {
          professionals: data.professionals,
          total: data.professionals.length,
        })
        
        cy.visit('/search')
        cy.getByTestId('map-view-toggle').click()
        
        // Click on marker
        cy.getByTestId('map-marker').first().click()
        
        // Should show info window
        cy.getByTestId('map-info-window').should('be.visible')
        cy.getByTestId('map-info-window').should('contain', data.professionals[0].firstName)
      })
    })
  })
})
