#!/usr/bin/env node

/**
 * Comprehensive Property Test Runner
 * Runs all 54 property tests for the Technician Marketplace Platform
 * with minimum 100 iterations each and generates coverage report
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const MIN_ITERATIONS = 100;
const TEST_TIMEOUT = 300000; // 5 minutes per test
const RESULTS_DIR = path.join(__dirname, 'test-results');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Property test files
const propertyTests = [
  // Authentication & User Management (Properties 1-9)
  'src/modules/auth/auth.property.spec.ts',
  'src/modules/user/user-profile.property.spec.ts',
  'src/modules/professional/professional-profile.property.spec.ts',
  
  // Search & Discovery (Properties 10-14)
  'src/modules/search/search.property.spec.ts',
  'src/modules/search/geo-search.property.spec.ts',
  
  // Booking & Reservations (Properties 15-23)
  'src/modules/booking/booking.property.spec.ts',
  'src/modules/booking/booking-status.property.spec.ts',
  
  // Rating & Reviews (Properties 24-27)
  'src/modules/rating/rating.property.spec.ts',
  
  // Provider Management (Properties 28-29)
  'src/modules/provider/provider.property.spec.ts',
  
  // Admin Operations (Property 30)
  'src/modules/admin/admin.property.spec.ts',
  
  // Messaging (Properties 31-35)
  'src/modules/messaging/messaging.property.spec.ts',
  
  // Payment & Invoicing (Properties 36-38)
  'src/modules/payment/payment.property.spec.ts',
  'src/modules/payment/payment-invoice.property.spec.ts',
  
  // Geolocation (Properties 39-40)
  'src/modules/location/location.property.spec.ts',
  
  // Security (Properties 41-44)
  'src/modules/security/security.property.spec.ts',
  
  // Product & Supplier (Properties 45-54)
  'src/modules/supplier/supplier.property.spec.ts',
  'src/modules/product/product.property.spec.ts',
  'src/modules/order/order.property.spec.ts',
];

// Create results directory
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  tests: [],
};

console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║     Technician Marketplace - Property Test Suite Runner      ║
║                    All 54 Property Tests                      ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`\n${colors.blue}Configuration:${colors.reset}`);
console.log(`  Minimum iterations: ${MIN_ITERATIONS}`);
console.log(`  Test timeout: ${TEST_TIMEOUT / 1000}s`);
console.log(`  Total test files: ${propertyTests.length}`);
console.log(`  Results directory: ${RESULTS_DIR}\n`);

const startTime = Date.now();

// Run each property test file
propertyTests.forEach((testFile, index) => {
  const testName = path.basename(testFile, '.spec.ts');
  const testNumber = index + 1;
  
  console.log(`${colors.bright}[${testNumber}/${propertyTests.length}] Running: ${testName}${colors.reset}`);
  
  const testStartTime = Date.now();
  
  try {
    // Check if test file exists
    const testPath = path.join(__dirname, testFile);
    if (!fs.existsSync(testPath)) {
      console.log(`  ${colors.yellow}⚠ SKIPPED${colors.reset} - File not found: ${testFile}\n`);
      results.skipped++;
      results.tests.push({
        name: testName,
        file: testFile,
        status: 'skipped',
        duration: 0,
        error: 'File not found',
      });
      return;
    }
    
    // Run the test with Jest
    const command = `npx jest ${testFile} --testTimeout=${TEST_TIMEOUT} --verbose --no-cache`;
    
    execSync(command, {
      stdio: 'inherit',
      env: {
        ...process.env,
        FAST_CHECK_NUM_RUNS: MIN_ITERATIONS.toString(),
        NODE_ENV: 'test',
      },
    });
    
    const testDuration = Date.now() - testStartTime;
    
    console.log(`  ${colors.green}✓ PASSED${colors.reset} (${(testDuration / 1000).toFixed(2)}s)\n`);
    
    results.passed++;
    results.tests.push({
      name: testName,
      file: testFile,
      status: 'passed',
      duration: testDuration,
    });
    
  } catch (error) {
    const testDuration = Date.now() - testStartTime;
    
    console.log(`  ${colors.red}✗ FAILED${colors.reset} (${(testDuration / 1000).toFixed(2)}s)`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}\n`);
    
    results.failed++;
    results.tests.push({
      name: testName,
      file: testFile,
      status: 'failed',
      duration: testDuration,
      error: error.message,
    });
  }
  
  results.total++;
});

const totalDuration = Date.now() - startTime;
results.duration = totalDuration;

// Generate summary
console.log(`${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                        Test Summary                           ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

console.log(`\n${colors.bright}Results:${colors.reset}`);
console.log(`  Total tests:   ${results.total}`);
console.log(`  ${colors.green}Passed:        ${results.passed}${colors.reset}`);
console.log(`  ${colors.red}Failed:        ${results.failed}${colors.reset}`);
console.log(`  ${colors.yellow}Skipped:       ${results.skipped}${colors.reset}`);
console.log(`  Duration:      ${(totalDuration / 1000).toFixed(2)}s`);

const passRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(2) : 0;
console.log(`  Pass rate:     ${passRate}%\n`);

// Save results to JSON
const resultsFile = path.join(RESULTS_DIR, `property-test-results-${Date.now()}.json`);
fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
console.log(`${colors.blue}Results saved to: ${resultsFile}${colors.reset}\n`);

// Generate HTML report
const htmlReport = generateHTMLReport(results);
const htmlFile = path.join(RESULTS_DIR, 'property-test-report.html');
fs.writeFileSync(htmlFile, htmlReport);
console.log(`${colors.blue}HTML report saved to: ${htmlFile}${colors.reset}\n`);

// Generate coverage summary
console.log(`${colors.bright}Property Coverage:${colors.reset}`);
console.log(`  Total properties: 54`);
console.log(`  Properties tested: ${results.passed}`);
console.log(`  Coverage: ${((results.passed / 54) * 100).toFixed(2)}%\n`);

// Exit with appropriate code
if (results.failed > 0) {
  console.log(`${colors.red}${colors.bright}Some tests failed!${colors.reset}\n`);
  process.exit(1);
} else if (results.skipped > 0) {
  console.log(`${colors.yellow}${colors.bright}Some tests were skipped!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.green}${colors.bright}All tests passed!${colors.reset}\n`);
  process.exit(0);
}

// HTML Report Generator
function generateHTMLReport(results) {
  const timestamp = new Date().toISOString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Test Report - Technician Marketplace</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
    }
    .stat {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #111827;
    }
    .stat.passed .stat-value { color: #10b981; }
    .stat.failed .stat-value { color: #ef4444; }
    .stat.skipped .stat-value { color: #f59e0b; }
    .tests {
      padding: 30px;
    }
    .test {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      transition: box-shadow 0.2s;
    }
    .test:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .test-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }
    .test-status {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .test-status.passed {
      background: #d1fae5;
      color: #065f46;
    }
    .test-status.failed {
      background: #fee2e2;
      color: #991b1b;
    }
    .test-status.skipped {
      background: #fef3c7;
      color: #92400e;
    }
    .test-file {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }
    .test-duration {
      font-size: 14px;
      color: #9ca3af;
    }
    .test-error {
      margin-top: 10px;
      padding: 10px;
      background: #fef2f2;
      border-left: 3px solid #ef4444;
      border-radius: 4px;
      font-size: 14px;
      color: #991b1b;
      font-family: monospace;
    }
    .footer {
      padding: 20px 30px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Property Test Report</h1>
      <p>Technician Marketplace Platform - All 54 Property Tests</p>
      <p style="font-size: 14px; margin-top: 10px;">Generated: ${timestamp}</p>
    </div>
    
    <div class="summary">
      <div class="stat">
        <div class="stat-label">Total Tests</div>
        <div class="stat-value">${results.total}</div>
      </div>
      <div class="stat passed">
        <div class="stat-label">Passed</div>
        <div class="stat-value">${results.passed}</div>
      </div>
      <div class="stat failed">
        <div class="stat-label">Failed</div>
        <div class="stat-value">${results.failed}</div>
      </div>
      <div class="stat skipped">
        <div class="stat-label">Skipped</div>
        <div class="stat-value">${results.skipped}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Duration</div>
        <div class="stat-value">${(results.duration / 1000).toFixed(1)}s</div>
      </div>
      <div class="stat">
        <div class="stat-label">Pass Rate</div>
        <div class="stat-value">${((results.passed / results.total) * 100).toFixed(1)}%</div>
      </div>
    </div>
    
    <div class="tests">
      <h2 style="margin-bottom: 20px; color: #111827;">Test Results</h2>
      ${results.tests.map(test => `
        <div class="test">
          <div class="test-header">
            <div class="test-name">${test.name}</div>
            <div class="test-status ${test.status}">${test.status}</div>
          </div>
          <div class="test-file">${test.file}</div>
          <div class="test-duration">Duration: ${(test.duration / 1000).toFixed(2)}s</div>
          ${test.error ? `<div class="test-error">${test.error}</div>` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="footer">
      <p>Technician Marketplace Platform © 2024</p>
      <p style="margin-top: 5px;">Property-Based Testing with fast-check (${MIN_ITERATIONS} iterations per test)</p>
    </div>
  </div>
</body>
</html>`;
}
