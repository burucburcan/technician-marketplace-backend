# Final Checkpoint Test Execution Script
# Task 30 - Comprehensive System Validation

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FINAL CHECKPOINT - TASK 30" -ForegroundColor Cyan
Write-Host "  Technician Marketplace Platform" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$testResults = @()

# Function to run test and record result
function Run-Test {
    param(
        [string]$TestName,
        [string]$TestPath,
        [string]$WorkingDir
    )
    
    Write-Host "Running: $TestName" -ForegroundColor Yellow
    
    $result = @{
        Name = $TestName
        Status = "UNKNOWN"
        Duration = 0
    }
    
    $startTime = Get-Date
    
    try {
        $output = & npm test -- --testPathPattern="$TestPath" --passWithNoTests 2>&1
        $exitCode = $LASTEXITCODE
        
        $endTime = Get-Date
        $result.Duration = ($endTime - $startTime).TotalSeconds
        
        if ($exitCode -eq 0) {
            $result.Status = "PASS"
            Write-Host "  ✓ PASS ($($result.Duration.ToString('F2'))s)" -ForegroundColor Green
        } else {
            $result.Status = "FAIL"
            Write-Host "  ✗ FAIL ($($result.Duration.ToString('F2'))s)" -ForegroundColor Red
        }
    } catch {
        $result.Status = "ERROR"
        Write-Host "  ✗ ERROR: $_" -ForegroundColor Red
    }
    
    return $result
}

# Change to backend directory
Set-Location "packages/backend"

Write-Host "`n=== 1. BACKEND UNIT TESTS ===" -ForegroundColor Cyan
Write-Host ""

$unitTests = @(
    @{Name="App Controller"; Path="app.controller.spec.ts"},
    @{Name="Auth Service"; Path="auth.service.spec.ts"},
    @{Name="User Service"; Path="user.service.spec.ts"},
    @{Name="Booking Service"; Path="booking.service.spec.ts"},
    @{Name="Notification Service"; Path="notification.service.spec.ts"}
)

foreach ($test in $unitTests) {
    $result = Run-Test -TestName $test.Name -TestPath $test.Path -WorkingDir "packages/backend"
    $testResults += $result
}

Write-Host "`n=== 2. PROPERTY-BASED TESTS (Sample) ===" -ForegroundColor Cyan
Write-Host ""

$propertyTests = @(
    @{Name="Auth Properties"; Path="auth.property.spec.ts"},
    @{Name="Booking Properties"; Path="booking.property.spec.ts"},
    @{Name="Payment Properties"; Path="payment.property.spec.ts"}
)

foreach ($test in $propertyTests) {
    $result = Run-Test -TestName $test.Name -TestPath $test.Path -WorkingDir "packages/backend"
    $testResults += $result
}

Write-Host "`n=== 3. INTEGRATION TESTS (Sample) ===" -ForegroundColor Cyan
Write-Host ""

$integrationTests = @(
    @{Name="Booking Integration"; Path="booking.integration.spec.ts"},
    @{Name="Notification Integration"; Path="notification.integration.spec.ts"}
)

foreach ($test in $integrationTests) {
    $result = Run-Test -TestName $test.Name -TestPath $test.Path -WorkingDir "packages/backend"
    $testResults += $result
}

# Return to root
Set-Location "../.."

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $testResults.Count
$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$errorTests = ($testResults | Where-Object { $_.Status -eq "ERROR" }).Count
$totalDuration = ($testResults | Measure-Object -Property Duration -Sum).Sum

Write-Host "Total Tests:   $totalTests" -ForegroundColor White
Write-Host "Passed:        $passedTests" -ForegroundColor Green
Write-Host "Failed:        $failedTests" -ForegroundColor $(if ($failedTests -gt 0) { "Red" } else { "White" })
Write-Host "Errors:        $errorTests" -ForegroundColor $(if ($errorTests -gt 0) { "Red" } else { "White" })
Write-Host "Duration:      $($totalDuration.ToString('F2'))s" -ForegroundColor White
Write-Host ""

if ($passedTests -eq $totalTests) {
    Write-Host "✓ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status: READY FOR PRODUCTION ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host "✗ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status: NOT READY FOR PRODUCTION" -ForegroundColor Red
    exit 1
}
