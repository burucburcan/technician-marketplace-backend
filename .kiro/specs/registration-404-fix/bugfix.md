# Bugfix Requirements Document

## Introduction

The registration endpoint is returning a 404 (Not Found) error when users attempt to register through the web frontend. The POST request to the registration endpoint fails, preventing new users from creating accounts on the platform. This is a critical issue as it blocks the primary user onboarding flow.

The error occurs when the frontend makes a POST request to: `https://technician-marketplacebackend-production.up.railway.app/auth/register`

**Root Cause Analysis:**

The backend is deployed on Railway and has a global `/api` prefix hardcoded in `main.ts` (`app.setGlobalPrefix('api')`), which means all routes should be accessed via `/api/*`. 

The frontend's RTK Query is correctly configured to use this prefix:
```typescript
baseUrl: `${import.meta.env.VITE_API_URL || ''}/api`
```

However, the 404 error shows the request is going to `/auth/register` without the `/api` prefix. This indicates one of the following issues:

1. **Environment Variable Not Loaded**: The `VITE_API_URL` environment variable may not be properly loaded during the frontend build, causing the baseUrl to be just `/api` instead of `https://...backend.../api`
2. **Build Cache Issue**: The frontend may be using a cached build that doesn't include the updated environment variables
3. **Backend Routing Issue**: The backend may not be properly handling requests with the `/api` prefix on Railway (though the code looks correct)
4. **CORS or Proxy Issue**: There may be a reverse proxy or CORS configuration that's stripping the `/api` prefix

The most likely cause is #1 or #2 - the frontend environment variable not being properly loaded or the build being cached.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user submits the registration form with valid data (email, password, firstName, lastName) THEN the system returns a 404 (Not Found) error

1.2 WHEN the frontend makes a POST request to the registration endpoint THEN the request fails to reach the correct backend route

1.3 WHEN the registration fails with 404 THEN the user cannot create an account and is blocked from accessing the platform

### Expected Behavior (Correct)

2.1 WHEN a user submits the registration form with valid data (email, password, firstName, lastName) THEN the system SHALL successfully process the registration request and return a 201 (Created) status with user data and access token

2.2 WHEN the frontend makes a POST request to the registration endpoint THEN the system SHALL correctly route the request to the backend auth controller's register method

2.3 WHEN the registration succeeds THEN the system SHALL return an AuthResponse containing accessToken, refreshToken, and user object, allowing the user to proceed to email verification

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits the login form with valid credentials THEN the system SHALL CONTINUE TO successfully authenticate the user and return appropriate tokens

3.2 WHEN the backend receives requests to other endpoints (e.g., /api/auth/login, /api/user/*, /api/booking/*) THEN the system SHALL CONTINUE TO route them correctly with the global /api prefix

3.3 WHEN the auth controller's register method is called directly THEN the system SHALL CONTINUE TO process registration logic correctly (validation, password hashing, user creation, token generation)

3.4 WHEN CORS is configured for the backend THEN the system SHALL CONTINUE TO allow requests from the configured frontend origins

3.5 WHEN the frontend makes requests to other auth endpoints (verify-email, reset-password, etc.) THEN the system SHALL CONTINUE TO route them correctly
