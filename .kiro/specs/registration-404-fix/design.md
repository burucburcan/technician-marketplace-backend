# Registration 404 Fix - Bugfix Design

## Overview

The registration endpoint returns a 404 error when users attempt to register through the web frontend. The backend is deployed on Railway with a global `/api` prefix, and the frontend RTK Query is configured to use this prefix. However, the 404 error indicates the request is not reaching the correct endpoint. This design document formalizes the bug condition, analyzes the root cause, and outlines a systematic fix and validation approach.

The fix strategy involves verifying the environment variable configuration, ensuring the frontend build includes the correct API URL, and validating that requests are properly routed to `/api/auth/register` on the Railway backend.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a registration POST request fails with 404 due to incorrect URL construction
- **Property (P)**: The desired behavior - registration requests should successfully reach `/api/auth/register` and return 201 with user data
- **Preservation**: Existing login functionality, other API endpoints, and backend routing that must remain unchanged
- **baseUrl**: The RTK Query configuration in `packages/web-frontend/src/store/api.ts` that constructs the API endpoint URL
- **VITE_API_URL**: Environment variable containing the Railway backend URL (`https://technician-marketplacebackend-production.up.railway.app`)
- **Global Prefix**: The `/api` prefix set in `packages/backend/src/main.ts` via `app.setGlobalPrefix('api')`

## Bug Details

### Fault Condition

The bug manifests when a user submits the registration form and the frontend makes a POST request that fails to reach the backend's `/api/auth/register` endpoint. The request either goes to the wrong URL (missing `/api` prefix or missing base domain) or the environment variable is not loaded during the build process.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type RegistrationRequest
  OUTPUT: boolean
  
  RETURN input.endpoint == 'register'
         AND input.method == 'POST'
         AND (constructedUrl does NOT include '/api/auth/register'
              OR constructedUrl does NOT include VITE_API_URL domain
              OR response.status == 404)
END FUNCTION
```

### Examples

- **Example 1**: User submits registration form → Request goes to `/auth/register` (missing `/api` prefix) → 404 error
- **Example 2**: User submits registration form → Request goes to `localhost:5173/api/auth/register` (missing Railway domain) → 404 error
- **Example 3**: User submits registration form → VITE_API_URL is undefined → baseUrl becomes `/api` → Request goes to relative path → 404 error
- **Edge Case**: User submits registration with valid data → Request should go to `https://technician-marketplacebackend-production.up.railway.app/api/auth/register` → 201 success

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Login endpoint (`/api/auth/login`) must continue to work correctly
- Other API endpoints (`/api/user/*`, `/api/booking/*`) must continue to route correctly
- Backend auth controller's register method logic (validation, password hashing, user creation) must remain unchanged
- CORS configuration must continue to allow requests from configured origins

**Scope:**
All inputs that do NOT involve the registration endpoint should be completely unaffected by this fix. This includes:
- Login requests
- Other authenticated API calls
- Backend routing for non-registration endpoints
- Token generation and validation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Environment Variable Not Loaded During Build**: The `VITE_API_URL` environment variable may not be available when the frontend is built for production
   - Vite requires environment variables to be present at build time (not runtime)
   - If `.env.production` is not read during build, `import.meta.env.VITE_API_URL` will be undefined
   - This causes baseUrl to be `undefined/api` or just `/api`, resulting in relative URLs

2. **Build Cache Issue**: The frontend deployment may be using a cached build that doesn't include updated environment variables
   - Railway or the build system may have cached the previous build
   - The cached build has the old baseUrl configuration without the correct VITE_API_URL

3. **Environment File Not Deployed**: The `.env.production` file may not be present in the deployment environment
   - Railway may not have access to the `.env.production` file
   - Environment variables need to be configured in Railway's dashboard

4. **Incorrect baseUrl Construction**: The string interpolation in `baseUrl: ${import.meta.env.VITE_API_URL || ''}/api` may produce unexpected results
   - If VITE_API_URL is empty string, baseUrl becomes `/api` (relative path)
   - If VITE_API_URL is undefined, baseUrl becomes `undefined/api`

## Correctness Properties

Property 1: Fault Condition - Registration Request Routing

_For any_ registration request where a user submits valid registration data (email, password, firstName, lastName), the fixed frontend SHALL construct the correct URL (`https://technician-marketplacebackend-production.up.railway.app/api/auth/register`) and successfully receive a 201 response with user data and tokens.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Other Endpoint Behavior

_For any_ API request that is NOT a registration request (login, user endpoints, booking endpoints), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing routing and functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct (environment variable not loaded or build cache issue):

**File**: `packages/web-frontend/.env.production` and Railway environment configuration

**Specific Changes**:
1. **Verify Environment Variable Configuration**: Ensure `VITE_API_URL` is set in Railway's environment variables dashboard
   - Navigate to Railway project settings
   - Add `VITE_API_URL=https://technician-marketplacebackend-production.up.railway.app`
   - Ensure the variable is available during build time

2. **Clear Build Cache**: Force a fresh build without cache
   - Trigger a new deployment in Railway
   - Ensure build cache is cleared before building

3. **Verify baseUrl Construction**: Add defensive checks to handle undefined VITE_API_URL
   - Consider adding a fallback or validation in `packages/web-frontend/src/store/api.ts`
   - Log the constructed baseUrl during development to verify correctness

4. **Add Build-Time Validation**: Ensure VITE_API_URL is defined during build
   - Add a check in `vite.config.ts` or build script to fail if VITE_API_URL is missing
   - This prevents deploying a broken build

5. **Test URL Construction**: Verify the final constructed URL in the browser
   - Check Network tab to see the actual request URL
   - Confirm it matches `https://technician-marketplacebackend-production.up.railway.app/api/auth/register`

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on the current deployment, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Inspect the current deployment to observe the actual request URL being constructed. Check browser Network tab, verify environment variable loading, and examine the built JavaScript bundle to see what value VITE_API_URL has at runtime.

**Test Cases**:
1. **Network Inspection Test**: Open browser DevTools → Submit registration form → Check Network tab for actual request URL (will show incorrect URL on unfixed deployment)
2. **Environment Variable Test**: Add `console.log(import.meta.env.VITE_API_URL)` in api.ts → Check browser console (will show undefined or empty on unfixed deployment)
3. **Bundle Inspection Test**: Examine the built JavaScript bundle for the baseUrl value (will show incorrect value on unfixed deployment)
4. **Railway Environment Test**: Check Railway dashboard for VITE_API_URL configuration (may be missing on unfixed deployment)

**Expected Counterexamples**:
- Request URL is `/auth/register` or `localhost:5173/api/auth/register` instead of full Railway URL
- Possible causes: VITE_API_URL undefined, build cache, environment variable not set in Railway

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := submitRegistration_fixed(input)
  ASSERT result.status == 201
  ASSERT result.data.accessToken EXISTS
  ASSERT result.data.user EXISTS
  ASSERT requestUrl == 'https://technician-marketplacebackend-production.up.railway.app/api/auth/register'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT submitLogin_original(input) = submitLogin_fixed(input)
  ASSERT otherApiCall_original(input) = otherApiCall_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-registration requests

**Test Plan**: Observe behavior on CURRENT deployment first for login and other API calls, then verify these continue working after the fix.

**Test Cases**:
1. **Login Preservation**: Verify login endpoint continues to work correctly after fix
2. **Other Endpoints Preservation**: Verify user profile, booking, and other endpoints continue to work after fix
3. **CORS Preservation**: Verify CORS headers and authentication continue to work after fix

### Unit Tests

- Test registration form submission with valid data
- Test that constructed URL includes full Railway domain and `/api` prefix
- Test that 404 errors are handled gracefully
- Test that successful registration returns expected response structure

### Property-Based Tests

- Generate random valid registration data and verify all requests construct correct URL
- Generate random API endpoint calls and verify baseUrl is correctly applied to all
- Test that environment variable changes are reflected in URL construction

### Integration Tests

- Test full registration flow from form submission to success response
- Test that registration success leads to proper authentication state
- Test that failed registration (validation errors) still works correctly
- Test switching between registration and login flows
