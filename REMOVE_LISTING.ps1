# =============================================================================
# Madmona - Remove/Hide Listing Tool (sanitized — reads from .env.local)
# =============================================================================
# This script reads the Supabase service role key from .env.local instead of
# embedding it in source. Never put credentials directly in a tracked file.
# =============================================================================
$ErrorActionPreference = "Stop"

# ---- Load credentials from .env.local ----
$EnvFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $EnvFile)) {
    Write-Host "[!] .env.local not found at $EnvFile" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$SupabaseUrl = $null
$ServiceKey  = $null
Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -match "^\s*#" -or $line -eq "") { return }
    if ($line -match "^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$") {
        $SupabaseUrl = $matches[1].Trim('"').Trim("'")
    }
    if ($line -match "^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.+)$") {
        $ServiceKey = $matches[1].Trim('"').Trim("'")
    }
}

if (-not $SupabaseUrl -or -not $ServiceKey) {
    Write-Host "[!] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# ---- Slug to search (override via first arg if you want) ----
$SearchSlug = if ($args[0]) { $args[0] } else { "moniyamh-laep" }

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

try {
    $SearchUri = "$SupabaseUrl/rest/v1/listings?slug=ilike.*$SearchSlug*&select=id,title,slug,status,created_at"
    $Found = Invoke-RestMethod -Uri $SearchUri -Headers $Headers -Method GET

    if (-not $Found -or $Found.Count -eq 0) {
        Write-Host "[!] NO LISTING FOUND with that slug!" -ForegroundColor Red
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

    foreach ($l in $Found) {
        $UpdateUri = "$SupabaseUrl/rest/v1/listings?id=eq.$($l.id)"
        $Body = '{"status":"draft"}'
        $null = Invoke-RestMethod -Uri $UpdateUri -Headers $Headers -Method PATCH -Body $Body
        Write-Host "  [OK] Hidden: $($l.title)" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "  DONE! Listing is now hidden." -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "[!] ERROR: $_" -ForegroundColor Red
    Write-Host ""
}

Read-Host "Press Enter to close"
