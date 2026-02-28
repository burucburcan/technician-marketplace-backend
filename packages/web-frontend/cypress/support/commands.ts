/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login as a user
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>
      
      /**
       * Custom command to logout
       * @example cy.logout()
       */
      logout(): Chainable<void>
      
      /**
       * Custom command to register a new user
       * @example cy.register('John', 'Doe', 'john@example.com', 'password123')
       */
      register(firstName: string, lastName: string, email: string, password: string): Chainable<void>
      
      /**
       * Custom command to get element by data-testid
       * @example cy.getByTestId('submit-button')
       */
      getByTestId(testId: string): Chainable<JQuery<HTMLElement>>
      
      /**
       * Custom command to mock API response
       * @example cy.mockApiResponse('GET', '/api/professionals', { data: [] })
       */
      mockApiResponse(method: string, url: string, response: any): Chainable<void>
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login')
  cy.getByTestId('email-input').type(email)
  cy.getByTestId('password-input').type(password)
  cy.getByTestId('login-button').click()
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard')
  
  // Store token in localStorage (if your app uses localStorage)
  cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken')
    if (token) {
      cy.log('Login successful, token stored')
    }
  })
})

// Logout command
Cypress.Commands.add('logout', () => {
  cy.getByTestId('user-menu').click()
  cy.getByTestId('logout-button').click()
  cy.url().should('include', '/login')
})

// Register command
Cypress.Commands.add('register', (firstName: string, lastName: string, email: string, password: string) => {
  cy.visit('/register')
  cy.getByTestId('first-name-input').type(firstName)
  cy.getByTestId('last-name-input').type(lastName)
  cy.getByTestId('email-input').type(email)
  cy.getByTestId('password-input').type(password)
  cy.getByTestId('confirm-password-input').type(password)
  cy.getByTestId('register-button').click()
})

// Get by test ID command
Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`)
})

// Mock API response command
Cypress.Commands.add('mockApiResponse', (method: string, url: string, response: any) => {
  cy.intercept(method, url, response).as('mockedRequest')
})

export {}
