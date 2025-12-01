# Simple API test script
Write-Host "Testing API..." -ForegroundColor Cyan

# Test 1: Users
Write-Host "`n1. Testing /api/users" -ForegroundColor Yellow
try {
    $users = Invoke-RestMethod -Uri "http://localhost:3000/api/users" -Method Get
    Write-Host "✓ Success - Found $($users.Count) users" -ForegroundColor Green
    $users | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Itineraries
Write-Host "`n2. Testing /api/itineraries" -ForegroundColor Yellow
try {
    $itineraries = Invoke-RestMethod -Uri "http://localhost:3000/api/itineraries" -Method Get
    Write-Host "✓ Success - Found $($itineraries.Count) itineraries" -ForegroundColor Green
    $itineraries | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Destinations
Write-Host "`n3. Testing /api/destinations" -ForegroundColor Yellow
try {
    $destinations = Invoke-RestMethod -Uri "http://localhost:3000/api/destinations" -Method Get
    Write-Host "✓ Success - Found $($destinations.Count) destinations" -ForegroundColor Green
    $destinations | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Activities
Write-Host "`n4. Testing /api/activities" -ForegroundColor Yellow
try {
    $activities = Invoke-RestMethod -Uri "http://localhost:3000/api/activities" -Method Get
    Write-Host "✓ Success - Found $($activities.Count) activities" -ForegroundColor Green
    $activities | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Accommodations
Write-Host "`n5. Testing /api/accommodations" -ForegroundColor Yellow
try {
    $accommodations = Invoke-RestMethod -Uri "http://localhost:3000/api/accommodations" -Method Get
    Write-Host "✓ Success - Found $($accommodations.Count) accommodations" -ForegroundColor Green
    $accommodations | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Expenses
Write-Host "`n6. Testing /api/expenses" -ForegroundColor Yellow
try {
    $expenses = Invoke-RestMethod -Uri "http://localhost:3000/api/expenses" -Method Get
    Write-Host "✓ Success - Found $($expenses.Count) expenses" -ForegroundColor Green
    $expenses | Format-Table -AutoSize
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTests complete!" -ForegroundColor Cyan
