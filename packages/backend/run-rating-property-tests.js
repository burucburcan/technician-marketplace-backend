#!/usr/bin/env node

/**
 * Test runner for rating property tests (Task 11.2)
 * This script runs the rating property tests to verify Properties 24, 26, and 27
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running rating property tests...\n');
  console.log('Testing Properties:');
  console.log('  - Property 24: Rating Profile Integration');
  console.log('  - Property 26: Only Completed Booking Rating');
  console.log('  - Property 27: Single Rating Constraint\n');
  
  const jestPath = path.join(__dirname, 'node_modules', '.bin', 'jest');
  const testFile = 'src/modules/rating/rating.property.spec.ts';
  
  const command = `"${jestPath}" "${testFile}" --run --verbose --testTimeout=60000`;
  
  console.log(`Command: ${command}\n`);
  
  execSync(command, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  console.log('\n✅ All rating property tests passed!');
  console.log('\nValidated Requirements:');
  console.log('  ✓ 7.2: Rating creation and profile integration');
  console.log('  ✓ 7.4: Only completed bookings can be rated');
  console.log('  ✓ 7.6: Single rating per booking constraint');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Rating property tests failed!');
  console.error(error.message);
  process.exit(1);
}
