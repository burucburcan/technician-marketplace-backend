# Session Management Testing Notes

## Test Requirements

The session management property tests require a running Redis instance to execute successfully.

## Running Tests

### Prerequisites

1. **Start Redis:**
   ```bash
   # Using Docker (recommended)
   docker run -d -p 6379:6379 redis:7
   
   # Or using local Redis installation
   redis-server
   ```

2. **Verify Redis is running:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

### Execute Tests

```bash
# Run session property tests
npm test -- session.property.spec.ts --testTimeout=60000

# Run auth-session integration tests
npm test -- auth-session.integration.spec.ts --testTimeout=60000
```

## Test Environment Setup

The tests expect Redis to be available at:
- **URL:** `redis://localhost:6379` (default)
- **Host:** `localhost`
- **Port:** `6379`

You can override this by setting the `REDIS_URL` environment variable:

```bash
export REDIS_URL=redis://your-redis-host:6379
npm test -- session.property.spec.ts
```

## CI/CD Integration

For CI/CD pipelines, ensure Redis is available as a service:

### GitHub Actions Example

```yaml
services:
  redis:
    image: redis:7
    ports:
      - 6379:6379
    options: >-
      --health-cmd "redis-cli ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### Docker Compose Example

```yaml
version: '3.8'
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Test Coverage

The property tests validate:

1. **Session Creation and Retrieval** - Round-trip data integrity
2. **24-Hour TTL** - Automatic expiration after 24 hours
3. **Session Deletion** - Proper cleanup
4. **Last Activity Updates** - TTL refresh on access
5. **User Session Management** - Delete all sessions for a user
6. **Non-existent Sessions** - Proper null handling
7. **Session Isolation** - User session separation

## Manual Verification

If automated tests cannot run, you can manually verify the implementation:

1. **Start Redis and the application**
2. **Register a user:**
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Password123!"}'
   ```

3. **Verify session in Redis:**
   ```bash
   redis-cli
   KEYS session:*
   GET session:<token>
   TTL session:<token>
   ```

4. **Expected Results:**
   - Session key exists in Redis
   - Session data contains userId, email, role
   - TTL is approximately 86400 seconds (24 hours)

## Troubleshooting

### Connection Refused Error

**Error:** `ECONNREFUSED ::1:6379` or `ECONNREFUSED 127.0.0.1:6379`

**Solution:**
- Ensure Redis is running: `redis-cli ping`
- Check Redis is listening on port 6379: `netstat -an | grep 6379`
- Verify firewall is not blocking port 6379

### Tests Timeout

**Error:** `Exceeded timeout of 30000 ms`

**Solution:**
- Increase test timeout: `--testTimeout=60000`
- Check Redis connection latency
- Ensure Redis is not overloaded

### Session Not Found

**Error:** Session returns null after creation

**Solution:**
- Verify Redis is running and accessible
- Check Redis logs for errors
- Ensure TTL is set correctly: `TTL session:<token>`

## Implementation Status

✅ **Implemented:**
- Session service with Redis storage
- 24-hour TTL configuration
- Session creation, retrieval, deletion
- Multi-session support
- Auth service integration
- Logout endpoints
- Property-based tests
- Integration tests
- Documentation

⚠️ **Requires:**
- Running Redis instance for tests
- CI/CD Redis service configuration

## Next Steps

1. Set up Redis in CI/CD pipeline
2. Run tests with Redis available
3. Verify all property tests pass
4. Deploy to staging environment with Redis
5. Monitor session metrics in production
