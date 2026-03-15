/**
 * Bug Condition Exploration Test for Registration 404 Fix
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * Property 1: Registration Request Routing Success
 * 
 * This test validates that registration requests:
 * 1. Construct the correct URL with Railway domain and /api prefix
 * 2. Receive 201 response (not 404) with valid registration data
 * 3. Return proper user data and authentication tokens
 * 
 * EXPECTED OUTCOME (after fix): Test PASSES
 * - Confirms registration requests route correctly
 * - Confirms bug is fixed
 */

describe('Registration Request Routing - Bug Condition Exploration', () => {
  const EXPECTED_API_URL = 'https://technician-marketplacebackend-production.up.railway.app/api/auth/register';
  
  beforeEach(() => {
    // Visit the registration page
    cy.visit('/register');
  });

  it('should construct correct URL for registration requests', () => {
    // Intercept the registration request to verify URL construction
    cy.intercept('POST', '**/api/auth/register').as('registerRequest');

    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    // Fill out registration form
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type('TestPassword123!');
    cy.get('input[name="confirmPassword"]').type('TestPassword123!');
    
    // Submit the form
    cy.get('button[type="submit"]').click();

    // Wait for the request and verify URL construction
    cy.wait('@registerRequest').then((interception) => {
      // Verify the request URL includes the correct domain and path
      expect(interception.request.url).to.include('/api/auth/register');
      expect(interception.request.url).to.include('technician-marketplacebackend-production.up.railway.app');
      
      // Verify the full URL matches expected
      expect(interception.request.url).to.equal(EXPECTED_API_URL);
      
      // Log the constructed URL for documentation
      cy.log('Constructed URL:', interception.request.url);
    });
  });

  it('should receive 201 response for valid registration data', () => {
    // Intercept the registration request
    cy.intercept('POST', '**/api/auth/register').as('registerRequest');

    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    // Fill out registration form with valid data
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type('TestPassword123!');
    cy.get('input[name="confirmPassword"]').type('TestPassword123!');
    
    // Submit the form
    cy.get('button[type="submit"]').click();

    // Wait for the request and verify response
    cy.wait('@registerRequest').then((interception) => {
      // Verify response status is 201 (Created), NOT 404
      expect(interception.response?.statusCode).to.equal(201);
      
      // Verify response contains expected data structure
      expect(interception.response?.body).to.have.property('accessToken');
      expect(interception.response?.body).to.have.property('refreshToken');
      expect(interception.response?.body).to.have.property('user');
      
      // Verify user object structure
      expect(interception.response?.body.user).to.have.property('id');
      expect(interception.response?.body.user).to.have.property('email');
      expect(interception.response?.body.user.email).to.equal(testEmail);
      
      // Log success for documentation
      cy.log('Registration successful with status:', interception.response?.statusCode);
    });
  });

  it('should verify VITE_API_URL is correctly loaded', () => {
    // This test verifies the environment variable is properly configured
    cy.window().then((win) => {
      // Access the Redux store to check the API configuration
      cy.visit('/register').then(() => {
        // Intercept to check the baseUrl being used
        cy.intercept('POST', '**/api/auth/register', (req) => {
          // Log the request URL to verify baseUrl construction
          cy.log('Request URL:', req.url);
          
          // Verify the URL includes the Railway domain (not localhost)
          expect(req.url).to.not.include('localhost');
          expect(req.url).to.include('technician-marketplacebackend-production.up.railway.app');
        }).as('registerRequest');

        // Generate unique test data
        const timestamp = Date.now();
        const testEmail = `test${timestamp}@example.com`;
        
        // Fill and submit form
        cy.get('input[name="firstName"]').type('Test');
        cy.get('input[name="lastName"]').type('User');
        cy.get('input[name="email"]').type(testEmail);
        cy.get('input[name="password"]').type('TestPassword123!');
        cy.get('input[name="confirmPassword"]').type('TestPassword123!');
        cy.get('button[type="submit"]').click();

        // Verify the request was made
        cy.wait('@registerRequest');
      });
    });
  });

  it('should NOT receive 404 error for registration requests', () => {
    // This test specifically checks that we don't get the bug condition (404 error)
    cy.intercept('POST', '**/api/auth/register').as('registerRequest');

    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    // Fill out registration form
    cy.get('input[name="firstName"]').type('Test');
    cy.get('input[name="lastName"]').type('User');
    cy.get('input[name="email"]').type(testEmail);
    cy.get('input[name="password"]').type('TestPassword123!');
    cy.get('input[name="confirmPassword"]').type('TestPassword123!');
    
    // Submit the form
    cy.get('button[type="submit"]').click();

    // Wait for the request and verify NO 404 error
    cy.wait('@registerRequest').then((interception) => {
      // Explicitly verify status is NOT 404
      expect(interception.response?.statusCode).to.not.equal(404);
      
      // Verify it's a success status (2xx)
      expect(interception.response?.statusCode).to.be.within(200, 299);
      
      cy.log('No 404 error - bug is fixed!');
    });
  });
});
