$ErrorActionPreference = "Stop"

# Madmona Service Role credentials
$SupabaseUrl = "https://mjhflxpxunwycbiquoig.supabase.co"
$ServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyODk5NiwiZXhwIjoyMDkyOTA0OTk2fQ.2hi_UCmFL9Cn4xvQKJRpna_JpWqqEVW8lJzhJ5h6ODw"

# Slug to search (from URL: madmonacairo.com/marketplace/listing-moniyamh-laep)
$SearchSlug = "moniyamh-laep"

$Headers = @{
    "apikey"        = $ServiceKey
    "Authorization" = "Bearer $ServiceKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=representation"
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Madmona - Remove/Hide Listing Tool" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Searching for listing with slug containing: $SearchSlug" -ForegroundColor Yellow
Write-Host ""

# Step 1: Find the listing
try {
    $SearchUri = "$SupabaseUrl/rest/v1/listings?slug=ilike.*$SearchSlug*&select=id,title,slug,status,created_at"
    $Found = Invoke-RestMethod -Uri $SearchUri -Headers $Headers -Method GET

    if (-not $Found -or $Found.Count -eq 0) {
        Write-Host "[!] NO LISTING FOUND with that slug!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Trying alternate search (slug starting with 'listing-')..." -ForegroundColor Yellow
        $SearchUri2 = "$SupabaseUrl/rest/v1/listings?slug=ilike.*listing-$SearchSlug*&select=id,title,slug,status"
        $Found = Invoke-RestMethod -Uri $SearchUri2 -Headers $Headers -Method GET
        if (-not $Found -or $Found.Count -eq 0) {
            Write-Host "[!] Still nothing found." -ForegroundColor Red
            Write-Host ""
            Write-Host "Listing all currently published listings..." -ForegroundColor Yellow
            $AllPub = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/listings?status=eq.published&select=id,title,slug" -Headers $Headers -Method GET
            $AllPub | ForEach-Object {
                Write-Host "  - $($_.title)" -ForegroundColor White
                Write-Host "    slug: $($_.slug)" -ForegroundColor Gray
            }
            Write-Host ""
            Read-Host "Press Enter to exit"
            exit 1
        }
    }

    Write-Host "[OK] FOUND LISTING(S):" -ForegroundColor Green
    Write-Host ""
    foreach ($l in $Found) {
        Write-Host "  Title:  $($l.title)" -ForegroundColor White
        Write-Host "  Slug:   $($l.slug)" -ForegroundColor Gray
        Write-Host "  Status: $($l.status)" -ForegroundColor Gray
        Write-Host "  ID:     $($l.id)" -ForegroundColor Gray
        Write-Host ""
    }

    Write-Host "Hiding from marketplace (status -> draft)..." -ForegroundColor Yellow

    # Step 2: Hide each found listing (set status to draft)
    foreach ($l in $Found) {
        $UpdateUri = "$SupabaseUrl/rest/v1/listings?id=eq.$($l.id)"
        $Body = '{"status":"draft"}'
        $Result = Invoke-RestMethod -Uri $UpdateUri -Headers $Headers -Method PATCH -Body $Body
        Write-Host "  [OK] Hidden: $($l.title)" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  DONE! Listing is now hidden." -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "It will no longer appear on madmonacairo.com/marketplace" -ForegroundColor Cyan
    Write-Host "Note: status set to 'draft' - data is preserved" -ForegroundColor Gray
    Write-Host "      You can republish anytime via /admin/listings" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "[!] ERROR: $_" -ForegroundColor Red
    Write-Host ""
}

Read-Host "Press Enter to close"
