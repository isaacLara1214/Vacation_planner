# PowerShell script to test all API routes
# Make sure the server is running: npm start

Write-Host "`n=== Testing Travel Planner API Routes ===" -ForegroundColor Cyan
Write-Host "Base URL: http://localhost:3000`n" -ForegroundColor Gray

$baseUrl = "http://localhost:3000"
$testsPassed = 0
$testsFailed = 0

function Test-Route {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Description,
        [object]$Body = $null
    )
    
    try {
        $uri = "$baseUrl$Endpoint"
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Body $jsonBody -ContentType "application/json" -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -ErrorAction Stop
        }
        
        Write-Host "✓ $Description" -ForegroundColor Green
        Write-Host "  Response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Gray
        $script:testsPassed++
        return $response
    } catch {
        Write-Host "✗ $Description" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
        return $null
    }
}

# ============ USERS TESTS ============
Write-Host "`n--- Testing Users Routes ---" -ForegroundColor Yellow

Test-Route -Method "GET" -Endpoint "/api/users" -Description "GET all users"
Test-Route -Method "GET" -Endpoint "/api/users/1" -Description "GET user by ID (1)"

# ============ ITINERARIES TESTS ============
Write-Host "`n--- Testing Itineraries Routes ---" -ForegroundColor Yellow

Test-Route -Method "GET" -Endpoint "/api/itineraries" -Description "GET all itineraries"
Test-Route -Method "GET" -Endpoint "/api/itineraries/1" -Description "GET itinerary by ID (1)"
Test-Route -Method "GET" -Endpoint "/api/itineraries/user/1" -Description "GET itineraries for user ID 1"

# ============ DESTINATIONS TESTS ============
Write-Host "`n--- Testing Destinations Routes ---" -ForegroundColor Yellow

Test-Route -Method "GET" -Endpoint "/api/destinations" -Description "GET all destinations"
Test-Route -Method "GET" -Endpoint "/api/destinations/itinerary/1" -Description "GET destinations for itinerary ID 1"

# ============ ACTIVITIES TESTS ============
Write-Host "`n--- Testing Activities Routes ---" -ForegroundColor Yellow

Test-Route -Method "GET" -Endpoint "/api/activities" -Description "GET all activities"
Test-Route -Method "GET" -Endpoint "/api/activities/destination/1" -Description "GET activities for destination ID 1"

# ============ ACCOMMODATIONS TESTS ============
Write-Host "`n--- Testing Accommodations Routes ---" -ForegroundColor Yellow

Test-Route -Method "GET" -Endpoint "/api/accommodations" -Description "GET all accommodations"
Test-Route -Method "GET" -Endpoint "/api/accommodations/destination/1" -Description "GET accommodations for destination ID 1"

# ============ EXPENSES TESTS ============
Write-Host "`n--- Testing Expenses Routes ---" -ForegroundColor Yellow

Test-Route -Method "GET" -Endpoint "/api/expenses" -Description "GET all expenses"
Test-Route -Method "GET" -Endpoint "/api/expenses/itinerary/1" -Description "GET expenses for itinerary ID 1"

# ============ CREATE TESTS ============
Write-Host "`n--- Testing CREATE Operations ---" -ForegroundColor Yellow

$newUser = @{
    Name = "John Doe"
    Email = "john.doe.test@example.com"
    Password = "testpass123"
}
$createdUser = Test-Route -Method "POST" -Endpoint "/api/users" -Description "POST create new user" -Body $newUser

# ============ SUMMARY ============
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Passed: $testsPassed" -ForegroundColor Green
Write-Host "Failed: $testsFailed" -ForegroundColor Red
Write-Host "Total:  $($testsPassed + $testsFailed)`n"

if ($testsFailed -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed. Check the output above." -ForegroundColor Red
}
