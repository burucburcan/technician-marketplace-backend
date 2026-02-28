@echo off
echo ========================================
echo Checkpoint 10 - Running All Tests
echo ========================================
echo.

cd packages\backend

echo Running Booking Service Tests...
echo ========================================
call npm test -- booking.service.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking.service.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Booking Integration Tests...
echo ========================================
call npm test -- booking.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Booking Property Tests...
echo ========================================
call npm test -- booking.property.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking.property.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Booking Status Tests...
echo ========================================
call npm test -- booking-status.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking-status.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Booking Query Tests...
echo ========================================
call npm test -- booking-query.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking-query.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Booking Cancel Tests...
echo ========================================
call npm test -- booking-cancel.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking-cancel.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Booking Notification Integration Tests...
echo ========================================
call npm test -- booking-notification.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: booking-notification.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Notification Service Tests...
echo ========================================
call npm test -- notification.service.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: notification.service.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Notification Property Tests...
echo ========================================
call npm test -- notification.property.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: notification.property.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Notification Endpoints Tests...
echo ========================================
call npm test -- notification-endpoints.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: notification-endpoints.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo Running Notification Preferences Tests...
echo ========================================
call npm test -- notification-preferences.integration.spec.ts
if %ERRORLEVEL% NEQ 0 (
    echo FAILED: notification-preferences.integration.spec.ts
    pause
    exit /b 1
)

echo.
echo ========================================
echo ALL TESTS PASSED!
echo ========================================
echo.
pause
