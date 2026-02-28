# Checkpoint 10 - Test Execution Script
# This script runs all booking and notification tests

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checkpoint 10 - Running All Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend directory
Set-Location -Path "packages\backend"

$testFiles = @(
    @{Name="Booking Service Tests"; File="booking.service.spec.ts"},
    @{Name="Booking Integration Tests"; File="booking.integration.spec.ts"},
    @{Name="Booking Property Tests"; File="booking.property.spec.ts"},
    @{Name="Booking Status Tests"; File="booking-status.integration.spec.ts"},
    @{Name="Booking Query Tests"; File="booking-query.integration.spec.ts"},
    @{Name="Booking Cancel Tests"; File="booking-cancel.integration.spec.ts"},
    @{Name="Booking Notification Integration Tests"; File="booking-notification.integration.spec.ts"},
    @{Name="Notification Service Tests"; File="notification.service.spec.ts"},
    @{Name="Notification Property Tests"; File="notification.property.spec.ts"},
    @{Name="Notification Endpoints Tests"; File="notification-endpoints.integration.spec.ts"},
    @{Name="Notification Preferences Tests"; File="notification-preferences.integration.spec.ts"}
)

$failedTests = @()
$passedTests = @()

foreach ($test in $testFiles) {
    Write-Host ""
    Write-Host "Running $($test.Name)..." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    
    $result = npm test -- $test.File
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ PASSED: $($test.Name)" -ForegroundColor Green
        $passedTests += $test.Name
    } else {
        Write-Host "✗ FAILED: $($test.Name)" -ForegroundColor Red
        $failedTests += $test.Name
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $($passedTests.Count)" -ForegroundColor Green
Write-Host "Failed: $($failedTests.Count)" -ForegroundColor Red
Write-Host ""

if ($failedTests.Count -gt 0) {
    Write-Host "Failed Tests:" -ForegroundColor Red
    foreach ($test in $failedTests) {
        Write-Host "  - $test" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
} else {
    Write-Host "ALL TESTS PASSED! ✓" -ForegroundColor Green
    Write-Host ""
    exit 0
}
