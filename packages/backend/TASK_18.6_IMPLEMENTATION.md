# Task 18.6: Session Management System Implementation

## Overview

This document describes the implementation of the session management system with Redis storage and automatic 24-hour session expiration, as required by Requirement 14.4.

## Requirements

**Requirement 14.4**: "THE Platform SHALL kullanıcı oturumlarını 24 saat sonra otomatik olarak sonlandırmalıdır" (The platform SHALL automatically terminate user sessions after 24 hours)

## Implementation

### 1. Session Module

Created a new `SessionModule` that provides session management functionality:

**Files:**
- `src/modules/session/session.module.ts` - Module definition
- `src/modules/session/session.service.ts` - Session service with Redis integration

**Key Features:**
- Redis-based session storage
- 24-hour TTL (Time To Live) for all sessions
- Automatic session expiration
- Session refresh on access
- Multi-session support per user

### 2. Session Service

The `SessionService` provides the following methods:

#### Core Methods

```typescript
// Create a new session
async createSession(sessionId: string, sessionData: SessionData): Promise<void>

// Get session data (refreshes TTL)
async getSession(sessionId: string): Promise<SessionData | null>

// Delete a specific session
async deleteSession(sessionId: string): Promise<void>

// Delete all sessions for a user
async deleteUserSessions(userId: string): Promise<void>

// Check if session is valid
async isSessionValid(sessionId: string): Promise<boolean>

// Get session TTL
async getSessionTTL(sessionId: string): Promise<number>

// Refresh session TTL
async refreshSession(sessionId: string): Promise<void>

// Get all active sessions for a user
async getUserSessions(userId: string): Promise<SessionData[]>
```

#### Session Data Structure

```typescript
interface SessionData {
  userId: string
  email: string
  role: string
  createdAt: number
  lastActivity: number
}
```

### 3. Session Storage

**Storage Backend:** Redis
- **Key Format:** `session:{sessionId}`
- **TTL:** 24 hours (86400 seconds)
- **Data Format:** JSON-serialized SessionData

**Configuration:**
- Redis URL configured via `REDIS_URL` environment variable
- Default: `redis://localhost:6379`

### 4. Auth Service Integration

Updated `AuthService` to integrate with session management:

**Changes:**
1. Injected `SessionService` dependency
2. Modified `generateTokens()` to create Redis session
3. Added `logout()` method to delete session
4. Added `logoutAllSessions()` method to delete all user sessions

**Session Creation Flow:**
```
User Login → Generate JWT Token → Create Redis Session → Return Token
```

**Session Validation Flow:**
```
Request → Extract Token → Validate JWT → Check Redis Session → Allow/Deny
```

### 5. Session Middleware

Created `SessionMiddleware` to validate sessions on each request:

**File:** `src/common/middleware/session.middleware.ts`

**Features:**
- Extracts session ID from Authorization header or cookie
- Validates session against Redis
- Attaches session data to request object
- Automatically refreshes session TTL on access

**Usage:**
```typescript
// Session data is available on request object
req.sessionId // Session ID
req.sessionData // Session data (userId, email, role, etc.)
```

### 6. Auth Controller Updates

Added new endpoints for session management:

```typescript
POST /auth/logout
- Logs out from current session
- Requires authentication
- Deletes session from Redis

POST /auth/logout-all
- Logs out from all sessions
- Requires authentication
- Deletes all user sessions from Redis
```

### 7. Automatic Session Expiration

**Implementation:**
- Sessions are stored in Redis with a 24-hour TTL
- Redis automatically deletes expired sessions
- No manual cleanup required

**TTL Refresh:**
- When a session is accessed via `getSession()`, the TTL is automatically refreshed
- This ensures active sessions remain valid
- Inactive sessions expire after 24 hours

### 8. Testing

#### Property-Based Tests

**File:** `src/modules/session/session.property.spec.ts`

**Properties Tested:**
1. **Session Creation and Retrieval Round-Trip** - Sessions can be created and retrieved with the same data
2. **Session Has 24-Hour TTL** - Sessions have a TTL of approximately 24 hours
3. **Deleted Sessions Are Not Retrievable** - Deleted sessions cannot be retrieved
4. **Session Retrieval Updates Last Activity** - Accessing a session updates its last activity timestamp
5. **Delete All User Sessions** - All sessions for a user can be deleted at once
6. **Non-existent Sessions Return Null** - Attempting to retrieve a non-existent session returns null
7. **Session Isolation Between Users** - Sessions for different users are isolated

**Test Configuration:**
- 50 iterations per property (30 for some complex properties)
- Uses `fast-check` for property-based testing
- Validates Requirement 14.4

#### Integration Tests

**File:** `src/modules/auth/auth-session.integration.spec.ts`

**Test Scenarios:**
1. Session creation on login
2. Correct session data storage
3. 24-hour TTL on session creation
4. TTL refresh on session access
5. Session deletion on logout
6. All sessions deletion on logout-all
7. Session validation
8. Invalid session rejection
9. Multiple concurrent sessions

### 9. Configuration

**Environment Variables:**

```env
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Session Configuration:**
- TTL: 24 hours (86400 seconds)
- Key Prefix: `session:`
- Auto-refresh: Enabled on access

## Security Considerations

1. **Session Isolation:** Each user's sessions are isolated and cannot be accessed by other users
2. **Automatic Expiration:** Sessions automatically expire after 24 hours of inactivity
3. **Secure Storage:** Session data is stored in Redis, not in JWT tokens
4. **Session Revocation:** Sessions can be revoked immediately via logout
5. **Multi-Session Support:** Users can have multiple active sessions (e.g., mobile + web)

## Usage Examples

### Creating a Session (Login)

```typescript
// User logs in
const loginResult = await authService.login({
  email: 'user@example.com',
  password: 'password123'
})

// Session is automatically created in Redis
// loginResult.accessToken is the session ID
```

### Validating a Session

```typescript
// Extract session ID from request
const sessionId = req.headers.authorization?.substring(7)

// Validate session
const sessionData = await sessionService.getSession(sessionId)

if (!sessionData) {
  throw new UnauthorizedException('Session expired')
}

// Session is valid, proceed with request
```

### Logging Out

```typescript
// Logout from current session
await authService.logout(sessionId)

// Logout from all sessions
await authService.logoutAllSessions(userId)
```

### Checking Session Status

```typescript
// Check if session is valid
const isValid = await sessionService.isSessionValid(sessionId)

// Get session TTL
const ttl = await sessionService.getSessionTTL(sessionId)

// Get all user sessions
const sessions = await sessionService.getUserSessions(userId)
```

## Performance Considerations

1. **Redis Performance:** Redis is extremely fast for session storage (sub-millisecond latency)
2. **TTL Management:** Redis handles TTL automatically, no manual cleanup needed
3. **Session Refresh:** Accessing a session refreshes its TTL, keeping active sessions alive
4. **Scalability:** Redis can handle millions of sessions with proper configuration

## Future Enhancements

1. **Session Analytics:** Track session duration, activity patterns
2. **Session Limits:** Limit number of concurrent sessions per user
3. **Device Tracking:** Store device information in session data
4. **Session Notifications:** Notify users of new sessions or suspicious activity
5. **Session History:** Keep audit log of session creation/deletion

## Compliance

This implementation satisfies:
- **Requirement 14.4:** Sessions automatically expire after 24 hours
- **Security Best Practices:** Secure session storage and management
- **GDPR Compliance:** Sessions can be deleted on user request

## Testing Instructions

### Running Property Tests

```bash
# Run all session property tests
npm test -- session.property.spec.ts

# Run with coverage
npm test -- --coverage session.property.spec.ts
```

### Running Integration Tests

```bash
# Run auth-session integration tests
npm test -- auth-session.integration.spec.ts

# Run all auth tests
npm test -- auth
```

### Manual Testing

1. **Start Redis:**
   ```bash
   docker run -d -p 6379:6379 redis:7
   ```

2. **Start the application:**
   ```bash
   npm run dev
   ```

3. **Test session creation:**
   ```bash
   # Register a user
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123!"}'

   # Login (creates session)
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123!"}'
   ```

4. **Test session validation:**
   ```bash
   # Use the access token from login response
   curl -X GET http://localhost:3000/auth/profile \
     -H "Authorization: Bearer <access_token>"
   ```

5. **Test logout:**
   ```bash
   # Logout from current session
   curl -X POST http://localhost:3000/auth/logout \
     -H "Authorization: Bearer <access_token>"

   # Logout from all sessions
   curl -X POST http://localhost:3000/auth/logout-all \
     -H "Authorization: Bearer <access_token>"
   ```

6. **Verify session in Redis:**
   ```bash
   # Connect to Redis
   redis-cli

   # List all session keys
   KEYS session:*

   # Get session data
   GET session:<session_id>

   # Check TTL
   TTL session:<session_id>
   ```

## Troubleshooting

### Redis Connection Issues

**Problem:** Cannot connect to Redis
**Solution:** 
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL environment variable
- Ensure Redis port (6379) is not blocked

### Session Not Found

**Problem:** Session returns null even though user just logged in
**Solution:**
- Check Redis connection
- Verify session ID is correct
- Check if session expired (TTL = -2 means expired)

### Session Not Expiring

**Problem:** Sessions not expiring after 24 hours
**Solution:**
- Verify TTL is set correctly: `TTL session:<session_id>`
- Check Redis configuration for maxmemory-policy
- Ensure Redis is not configured with `noeviction` policy

## Conclusion

The session management system is now fully implemented with:
- ✅ Redis session storage
- ✅ 24-hour automatic expiration
- ✅ Session refresh on access
- ✅ Multi-session support
- ✅ Logout functionality
- ✅ Comprehensive property-based tests
- ✅ Integration tests
- ✅ Full compliance with Requirement 14.4
