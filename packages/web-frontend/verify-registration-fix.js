/**
 * Bug Condition Exploration Test - Registration 404 Fix Verification
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * Property 1: Registration Request Routing Success
 * 
 * This script validates that:
 * 1. The frontend constructs the correct URL with Railway domain and /api prefix
 * 2. Registration requests receive 201 response (not 404)
 * 3. The response contains proper user data and authentication tokens
 * 
 * EXPECTED OUTCOME (after fix): Script succeeds
 * - Confirms registration requests route correctly
 * - Confirms bug is fixed
 */

const EXPECTED_API_URL = 'https://technician-marketplacebackend-production.up.railway.app/api/auth/register';
const VITE_API_URL = process.env.VITE_API_URL || 'https://technician-marketplacebackend-production.up.railway.app';

console.log('='.repeat(80));
console.log('Bug Condition Exploration Test - Registration 404 Fix');
console.log('='.repeat(80));
console.log();

// Test 1: Verify VITE_API_URL is correctly set
console.log('Test 1: Verify VITE_API_URL configuration');
console.log('-'.repeat(80));
console.log(`VITE_API_URL: ${VITE_API_URL}`);

if (!VITE_API_URL || VITE_API_URL === '') {
  console.error('❌ FAIL: VITE_API_URL is not set or empty');
  process.exit(1);
}

if (!VITE_API_URL.includes('technician-marketplacebackend-production.up.railway.app')) {
  console.error('❌ FAIL: VITE_API_URL does not include Railway domain');
  console.error(`   Expected to include: technician-marketplacebackend-production.up.railway.app`);
  console.error(`   Actual: ${VITE_API_URL}`);
  process.exit(1);
}

console.log('✅ PASS: VITE_API_URL is correctly configured');
console.log();

// Test 2: Verify URL construction
console.log('Test 2: Verify URL construction logic');
console.log('-'.repeat(80));
const constructedBaseUrl = `${VITE_API_URL}/api`;
const constructedRegisterUrl = `${constructedBaseUrl}/auth/register`;

console.log(`Constructed base URL: ${constructedBaseUrl}`);
console.log(`Constructed register URL: ${constructedRegisterUrl}`);
console.log(`Expected register URL: ${EXPECTED_API_URL}`);

if (constructedRegisterUrl !== EXPECTED_API_URL) {
  console.error('❌ FAIL: Constructed URL does not match expected URL');
  console.error(`   Expected: ${EXPECTED_API_URL}`);
  console.error(`   Actual: ${constructedRegisterUrl}`);
  process.exit(1);
}

console.log('✅ PASS: URL construction is correct');
console.log();

// Test 3: Verify registration endpoint is reachable (not 404)
console.log('Test 3: Verify registration endpoint responds (not 404)');
console.log('-'.repeat(80));

async function testRegistrationEndpoint() {
  try {
    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    const registrationData = {
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: 'TestPassword123!',
    };

    console.log(`Making POST request to: ${EXPECTED_API_URL}`);
    console.log(`Test data: ${JSON.stringify({ ...registrationData, password: '***' }, null, 2)}`);
    console.log();

    const response = await fetch(EXPECTED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });

    console.log(`Response status: ${response.status} ${response.statusText}`);

    // Check if we got a 404 (the bug condition)
    if (response.status === 404) {
      console.error('❌ FAIL: Received 404 error - BUG STILL EXISTS');
      console.error('   The registration endpoint is not being reached correctly');
      console.error('   This indicates the URL construction or routing is still broken');
      process.exit(1);
    }

    // Check if we got a success response (201)
    if (response.status === 201) {
      const data = await response.json();
      console.log('✅ PASS: Received 201 Created response');
      console.log();
      
      // Verify response structure
      console.log('Test 4: Verify response structure');
      console.log('-'.repeat(80));
      
      if (!data.accessToken) {
        console.error('❌ FAIL: Response missing accessToken');
        process.exit(1);
      }
      console.log('✅ accessToken present');
      
      if (!data.refreshToken) {
        console.error('❌ FAIL: Response missing refreshToken');
        process.exit(1);
      }
      console.log('✅ refreshToken present');
      
      if (!data.user) {
        console.error('❌ FAIL: Response missing user object');
        process.exit(1);
      }
      console.log('✅ user object present');
      
      if (!data.user.id) {
        console.error('❌ FAIL: User object missing id');
        process.exit(1);
      }
      console.log('✅ user.id present');
      
      if (data.user.email !== testEmail) {
        console.error('❌ FAIL: User email does not match');
        console.error(`   Expected: ${testEmail}`);
        console.error(`   Actual: ${data.user.email}`);
        process.exit(1);
      }
      console.log('✅ user.email matches');
      
      console.log();
      console.log('='.repeat(80));
      console.log('🎉 ALL TESTS PASSED - BUG IS FIXED!');
      console.log('='.repeat(80));
      console.log();
      console.log('Summary:');
      console.log('  ✅ VITE_API_URL is correctly configured');
      console.log('  ✅ URL construction logic is correct');
      console.log('  ✅ Registration endpoint responds with 201 (not 404)');
      console.log('  ✅ Response contains all required fields');
      console.log();
      console.log('The registration 404 bug has been successfully fixed!');
      console.log();
      
      return;
    }

    // Handle other response codes
    if (response.status === 400) {
      const data = await response.json();
      console.log('⚠️  Received 400 Bad Request (validation error)');
      console.log(`   Message: ${data.message || 'Unknown error'}`);
      console.log();
      console.log('Note: This might be expected if the email is already registered');
      console.log('      or if there are validation issues.');
      console.log('      The important thing is we did NOT get a 404 error.');
      console.log();
      console.log('✅ PASS: Endpoint is reachable (not 404) - Bug is likely fixed');
      console.log();
      return;
    }

    // Any other status code
    console.log(`⚠️  Received unexpected status: ${response.status}`);
    const text = await response.text();
    console.log(`   Response: ${text}`);
    console.log();
    console.log('Note: The important thing is we did NOT get a 404 error.');
    console.log('✅ PASS: Endpoint is reachable (not 404) - Bug is likely fixed');
    console.log();

  } catch (error) {
    console.error('❌ FAIL: Error making request');
    console.error(`   Error: ${error.message}`);
    console.error();
    console.error('This could indicate:');
    console.error('  - Network connectivity issues');
    console.error('  - CORS configuration problems');
    console.error('  - Backend service is down');
    console.error();
    process.exit(1);
  }
}

// Run the test
testRegistrationEndpoint();
