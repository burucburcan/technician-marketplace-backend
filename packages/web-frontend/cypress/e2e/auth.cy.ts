/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    // Clear cookies and localStorage before each test
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('User Registration', () => {
    it('should successfully register a new user', () => {
      cy.fixture('users').then((users) => {
        const newUser = {
          ...users.testUser,
          email: `test${Date.now()}@example.com`, // Unique email
        }

        cy.visit('/register')
        
        // Fill registration form
        cy.getByTestId('first-name-input').type(newUser.firstName)
        cy.getByTestId('last-name-input').type(newUser.lastName)
        cy.getByTestId('email-input').type(newUser.email)
        cy.getByTestId('password-input').type(newUser.password)
        cy.getByTestId('confirm-password-input').type(newUser.password)
        
        // Submit form
        cy.getByTestId('register-button').click()
        
        // Should show success message
        cy.contains(/registro exitoso|registration successful/i).should('be.visible')
        
        // Should redirect to email verification page or login
        cy.url().should('match', /\/(verify-email|login)/)
      })
    })

    it('should show validation errors for invalid inputs', () => {
      cy.visit('/register')
      
      // Try to submit empty form
      cy.getByTestId('register-button').click()
      
      // Should show validation errors
      cy.contains(/requerido|required/i).should('be.visible')
    })

    it('should show error for mismatched passwords', () => {
      cy.visit('/register')
      
      cy.getByTestId('first-name-input').type('Test')
      cy.getByTestId('last-name-input').type('User')
      cy.getByTestId('email-input').type('test@example.com')
      cy.getByTestId('password-input').type('Password123!')
      cy.getByTestId('confirm-password-input').type('DifferentPassword123!')
      
      cy.getByTestId('register-button').click()
      
      // Should show password mismatch error
      cy.contains(/contraseñas no coinciden|passwords do not match/i).should('be.visible')
    })

    it('should show error for already registered email', () => {
      cy.fixture('users').then((users) => {
        cy.visit('/register')
        
        // Try to register with existing email
        cy.getByTestId('first-name-input').type(users.testUser.firstName)
        cy.getByTestId('last-name-input').type(users.testUser.lastName)
        cy.getByTestId('email-input').type(users.testUser.email)
        cy.getByTestId('password-input').type(users.testUser.password)
        cy.getByTestId('confirm-password-input').type(users.testUser.password)
        
        cy.getByTestId('register-button').click()
        
        // Should show error for duplicate email
        cy.contains(/email ya existe|email already exists/i, { timeout: 10000 }).should('be.visible')
      })
    })
  })

  describe('User Login', () => {
    it('should successfully login with valid credentials', () => {
      cy.fixture('users').then((users) => {
        cy.login(users.testUser.email, users.testUser.password)
        
        // Should be on dashboard
        cy.url().should('include', '/dashboard')
        
        // Should show user name or welcome message
        cy.contains(users.testUser.firstName).should('be.visible')
      })
    })

    it('should show error for invalid credentials', () => {
      cy.visit('/login')
      
      cy.getByTestId('email-input').type('invalid@example.com')
      cy.getByTestId('password-input').type('WrongPassword123!')
      cy.getByTestId('login-button').click()
      
      // Should show error message
      cy.contains(/credenciales inválidas|invalid credentials/i).should('be.visible')
      
      // Should remain on login page
      cy.url().should('include', '/login')
    })

    it('should show validation errors for empty fields', () => {
      cy.visit('/login')
      
      cy.getByTestId('login-button').click()
      
      // Should show validation errors
      cy.contains(/requerido|required/i).should('be.visible')
    })

    it('should redirect to login when accessing protected route without auth', () => {
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })
  })

  describe('User Logout', () => {
    it('should successfully logout', () => {
      cy.fixture('users').then((users) => {
        // Login first
        cy.login(users.testUser.email, users.testUser.password)
        
        // Logout
        cy.logout()
        
        // Should be on login page
        cy.url().should('include', '/login')
        
        // Should not be able to access protected routes
        cy.visit('/dashboard')
        cy.url().should('include', '/login')
      })
    })
  })

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      cy.fixture('users').then((users) => {
        cy.visit('/login')
        
        // Click forgot password link
        cy.contains(/olvidaste tu contraseña|forgot password/i).click()
        
        // Should be on reset password page
        cy.url().should('include', '/reset-password')
        
        // Enter email
        cy.getByTestId('email-input').type(users.testUser.email)
        cy.getByTestId('reset-button').click()
        
        // Should show success message
        cy.contains(/correo enviado|email sent/i).should('be.visible')
      })
    })

    it('should show error for non-existent email', () => {
      cy.visit('/reset-password')
      
      cy.getByTestId('email-input').type('nonexistent@example.com')
      cy.getByTestId('reset-button').click()
      
      // Should show error or success (for security reasons, might show success)
      cy.contains(/correo enviado|email sent|usuario no encontrado|user not found/i).should('be.visible')
    })
  })

  describe('Email Verification', () => {
    it('should verify email with valid token', () => {
      // Mock API response for email verification
      cy.mockApiResponse('POST', '**/api/auth/verify-email', {
        success: true,
        message: 'Email verified successfully',
      })
      
      cy.visit('/verify-email?token=valid-token-123')
      
      // Should show success message
      cy.contains(/email verificado|email verified/i).should('be.visible')
      
      // Should have link to login
      cy.contains(/iniciar sesión|login/i).click()
      cy.url().should('include', '/login')
    })

    it('should show error for invalid token', () => {
      // Mock API response for invalid token
      cy.mockApiResponse('POST', '**/api/auth/verify-email', {
        statusCode: 400,
        body: {
          error: 'Invalid or expired token',
        },
      })
      
      cy.visit('/verify-email?token=invalid-token')
      
      // Should show error message
      cy.contains(/token inválido|invalid token|expirado|expired/i).should('be.visible')
    })
  })
})
