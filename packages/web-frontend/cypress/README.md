# Cypress E2E Tests

This directory contains end-to-end tests for the Technician Marketplace Platform web frontend.

## Quick Start

### Run Tests Interactively
```bash
npm run cypress
```

### Run Tests Headlessly
```bash
npm run cypress:headless
```

### Run Tests with Dev Server
```bash
npm run e2e          # Interactive
npm run e2e:headless # Headless
```

## Directory Structure

```
cypress/
├── e2e/                    # Test files
│   ├── auth.cy.ts         # Authentication tests
│   ├── search.cy.ts       # Search functionality tests
│   ├── booking.cy.ts      # Booking flow tests
│   ├── payment.cy.ts      # Payment processing tests
│   ├── professional-dashboard.cy.ts  # Professional features
│   └── admin.cy.ts        # Admin panel tests
├── fixtures/              # Test data
│   ├── users.json        # User test data
│   ├── bookings.json     # Booking test data
│   └── professionals.json # Professional test data
└── support/              # Support files
    ├── e2e.ts           # Global setup
    └── commands.ts      # Custom commands
```

## Custom Commands

### Authentication
```typescript
// Login
cy.login('user@example.com', 'password123')

// Logout
cy.logout()

// Register
cy.register('John', 'Doe', 'john@example.com', 'password123')
```

### Utilities
```typescript
// Get element by test ID
cy.getByTestId('submit-button')

// Mock API response
cy.mockApiResponse('GET', '/api/professionals', { data: [] })
```

## Writing Tests

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('should do something', () => {
    // Test implementation
    cy.visit('/page')
    cy.getByTestId('element').click()
    cy.contains('Expected text').should('be.visible')
  })
})
```

### Best Practices

1. **Use data-testid attributes**
   ```typescript
   cy.getByTestId('login-button')
   ```

2. **Mock API responses**
   ```typescript
   cy.mockApiResponse('GET', '**/api/users', { users: [] })
   ```

3. **Use fixtures for test data**
   ```typescript
   cy.fixture('users').then((users) => {
     cy.login(users.testUser.email, users.testUser.password)
   })
   ```

4. **Write descriptive test names**
   ```typescript
   it('should display error message when login fails', () => {
     // Test implementation
   })
   ```

5. **Keep tests independent**
   - Each test should work in isolation
   - Don't rely on state from previous tests
   - Clean up after each test

## Test Data

### Users Fixture
```json
{
  "testUser": {
    "email": "testuser@example.com",
    "password": "TestPassword123!"
  }
}
```

### Using Fixtures
```typescript
cy.fixture('users').then((users) => {
  cy.login(users.testUser.email, users.testUser.password)
})
```

## Debugging

### Interactive Mode
1. Run `npm run cypress`
2. Click on test file to run
3. Use time-travel debugging in Cypress UI
4. Inspect DOM snapshots

### Headless Mode
1. Check console output for errors
2. Review screenshots in `cypress/screenshots/`
3. Watch videos in `cypress/videos/`

### Debug Commands
```typescript
// Pause test execution
cy.pause()

// Debug current state
cy.debug()

// Log to console
cy.log('Debug message')
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Install dependencies
  run: npm ci

- name: Run E2E tests
  run: npm run e2e:headless

- name: Upload artifacts
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: cypress-artifacts
    path: |
      cypress/videos
      cypress/screenshots
```

## Configuration

Configuration is in `cypress.config.ts`:
- Base URL: http://localhost:3001
- Viewport: 1280x720
- Timeouts: 10 seconds
- Retries: 2 (run mode), 0 (open mode)
- Video: Enabled
- Screenshots: On failure

## Troubleshooting

### Tests Failing Locally
1. Ensure dev server is running on port 3001
2. Clear browser cache and cookies
3. Check for API mocking issues
4. Verify test data in fixtures

### Timeout Errors
1. Increase timeout in cypress.config.ts
2. Check network requests
3. Verify element selectors

### Element Not Found
1. Check data-testid attribute exists
2. Wait for element to be visible
3. Use cy.wait() if needed

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Testing Library](https://testing-library.com/docs/cypress-testing-library/intro/)
- [Cypress Examples](https://example.cypress.io/)
