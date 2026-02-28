#!/usr/bin/env node

/**
 * Simple test runner for property tests
 * This script runs the booking property tests to verify Property 19 and Property 21
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running booking property tests...\n');
  
  const jestPath = path.join(__dirname, 'node_modules', '.bin', 'jest');
  const testFile = 'src/modules/booking/booking.property.spec.ts';
  const testPattern = 'Property 19|Property 21';
  
  const command = `"${jestPath}" "${testFile}" --testNamePattern="${testPattern}" --run --verbose`;
  
  console.log(`Command: ${command}\n`);
  
  execSync(command, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });
  
  console.log('\n✅ All property tests passed!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Property tests failed!');
  console.error(error.message);
  process.exit(1);
}
