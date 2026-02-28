# Task 11.2: Rating Property Tests - Test Instructions

## Overview
This document provides instructions for running the property tests for Task 11.2.

## Test File Location
`packages/backend/src/modules/rating/rating.property.spec.ts`

## Properties Being Tested

### Property 24: Rating Profile Integration
- **Validates**: Requirement 7.2
- **Tests**: Rating creation and linkage to professional profile
- **Iterations**: 100 per test case

### Property 26: Only Completed Booking Rating
- **Validates**: Requirement 7.4
- **Tests**: Only completed bookings can be rated
- **Iterations**: 100 per test case

### Property 27: Single Rating Constraint
- **Validates**: Requirement 7.6
- **Tests**: Each booking can only be rated once
- **Iterations**: 100 per test case

## How to Run the Tests

### Option 1: Using the Test Runner Script (Recommended)
```bash
cd packages/backend
node run-rating-property-tests.js
```

### Option 2: Using npm/pnpm directly
```bash
cd packages/backend
npm test -- rating.property.spec.ts --run --verbose --testTimeout=60000
```

Or with pnpm:
```bash
cd packages/backend
pnpm test rating.property.spec.ts --run --verbose --testTimeout=60000
```

### Option 3: Using Jest directly
```bash
cd packages/backend
npx jest src/modules/rating/rating.property.spec.ts --run --verbose --testTimeout=60000
```

### Option 4: From project root
```bash
npm run test -- --filter=backend -- rating.property.spec.ts --run --verbose --testTimeout=60000
```

## Expected Output

### Success Output
```
Running rating property tests...

Testing Properties:
  - Property 24: Rating Profile Integration
  - Property 26: Only Completed Booking Rating
  - Property 27: Single Rating Constraint

PASS  src/modules/rating/rating.property.spec.ts
  RatingService Property Tests
    Property 24: Rating Profile Integration
      ✓ should add rating to professional profile for any valid rating (XXXms)
      ✓ should maintain rating data integrity when retrieving by professional ID (XXXms)
    Property 26: Only Completed Booking Rating
      ✓ should reject ratings for any non-completed booking status (XXXms)
      ✓ should allow ratings for any completed booking (XXXms)
    Property 27: Single Rating Constraint
      ✓ should reject second rating attempt for any booking already rated (XXXms)
      ✓ should allow first rating for any booking without existing rating (XXXms)
      ✓ should enforce single rating constraint across different users for same booking (XXXms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total

✅ All rating property tests passed!

Validated Requirements:
  ✓ 7.2: Rating creation and profile integration
  ✓ 7.4: Only completed bookings can be rated
  ✓ 7.6: Single rating per booking constraint
```

### Failure Output
If any test fails, you'll see:
```
❌ Rating property tests failed!
```

Along with details about which property test failed and the counterexample that caused the failure.

## Troubleshooting

### If tests timeout
Increase the timeout value:
```bash
npm test -- rating.property.spec.ts --run --verbose --testTimeout=120000
```

### If dependencies are missing
Install dependencies first:
```bash
cd packages/backend
npm install
```

### If you see module not found errors
Make sure you're in the correct directory and dependencies are installed:
```bash
cd packages/backend
npm install
npm test -- rating.property.spec.ts --run
```

## What to Report Back

After running the tests, please report:

1. **Test Status**: Did all tests pass? ✅ or ❌
2. **Number of Tests**: How many tests ran and passed?
3. **Execution Time**: How long did the tests take?
4. **Any Failures**: If any tests failed, what was the error message?
5. **Counterexamples**: If property tests failed, what were the counterexamples?

## Next Steps

Once the tests pass:
- Task 11.2 will be marked as complete
- The implementation will be verified against requirements 7.2, 7.4, and 7.6
- We can proceed to Task 11.3 (average rating calculation)
