# ============================================================================
# Madmona — Apply Categories Migration (PowerShell)
# Connects via Supabase Management API. No psql or Node required.
# ============================================================================

$ErrorActionPreference = 'Stop'

# Force UTF-8 output (handles Arabic in console)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile     = Join-Path $ProjectRoot '.env.local'
$SqlFile     = Join-Path $ProjectRoot 'supabase\migrations\20260505000000_more_categories.sql'

Write-Host ''
Write-Host '====================================================' -ForegroundColor Cyan
Write-Host ' Madmona  -  Apply Categories Migration' -ForegroundColor Cyan
Write-Host '====================================================' -ForegroundColor Cyan
Write-Host ''

# ----------------------------------------------------------------------------
# Helper: parse .env file
# ----------------------------------------------------------------------------
function Read-EnvFile {
    param([string]$Path)
    $envData = @{}
    if (-not (Test-Path $Path)) { return $envData }

    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line) { return }
        if ($line.StartsWith('#')) { return }
        $eq = $line.IndexOf('=')
        if ($eq -lt 0) { return }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $envData[$key] = $value
    }
    return $envData
}

# ----------------------------------------------------------------------------
# 1. Load .env.local
# ----------------------------------------------------------------------------
if (-not (Test-Path $EnvFile)) {
    Write-Host "[FAIL] .env.local not found at: $EnvFile" -ForegroundColor Red
    exit 1
}
$envData = Read-EnvFile -Path $EnvFile
Write-Host "[OK]   Loaded .env.local" -ForegroundColor Green

# ----------------------------------------------------------------------------
# 2. Extract project ref from SUPABASE_URL
# ----------------------------------------------------------------------------
$supabaseUrl = $envData['NEXT_PUBLIC_SUPABASE_URL']
$projectRef  = $null
if ($supabaseUrl -match 'https?://([a-z0-9-]+)\.supabase\.co') {
    $projectRef = $matches[1]
}

if (-not $projectRef) {
    Write-Host '[FAIL] NEXT_PUBLIC_SUPABASE_URL not found or invalid in .env.local' -ForegroundColor Red
    exit 1
}
Write-Host "[OK]   Project ref: $projectRef" -ForegroundColor Green

# ----------------------------------------------------------------------------
# 3. Get Personal Access Token
# ----------------------------------------------------------------------------
$accessToken = $envData['SUPABASE_ACCESS_TOKEN']

if (-not $accessToken) {
    Write-Host ''
    Write-Host '[!]    SUPABASE_ACCESS_TOKEN not found in .env.local' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '       لازم تجيبه مرة واحدة من Supabase:' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '       1. افتح:'
    Write-Host '          https://supabase.com/dashboard/account/tokens' -ForegroundColor Cyan
    Write-Host '       2. اضغط Generate new token'
    Write-Host '       3. سميه: Madmona Migrations'
    Write-Host '       4. انسخ الـ token (هيظهر مرة واحدة بس)'
    Write-Host '       5. ضيف السطر ده في .env.local:'
    Write-Host ''
    Write-Host '          SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxx' -ForegroundColor Cyan
    Write-Host ''
    Write-Host '       6. شغل الـ bat تاني'
    Write-Host ''
    Write-Host '       ─────────────────────────────────────────'
    Write-Host '       أو نفذ الـ SQL يدوي في Supabase Studio:'
    Write-Host "          https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
    Write-Host '       وانسخ محتوى:'
    Write-Host "          $SqlFile"
    Write-Host ''
    exit 2
}
Write-Host "[OK]   Found SUPABASE_ACCESS_TOKEN ($($accessToken.Substring(0, [Math]::Min(8, $accessToken.Length)))...)" -ForegroundColor Green

# ----------------------------------------------------------------------------
# 4. Read SQL file
# ----------------------------------------------------------------------------
if (-not (Test-Path $SqlFile)) {
    Write-Host "[FAIL] Migration file not found: $SqlFile" -ForegroundColor Red
    exit 1
}
$sqlText = Get-Content -LiteralPath $SqlFile -Raw -Encoding UTF8
Write-Host "[OK]   Loaded SQL ($($sqlText.Length) chars)" -ForegroundColor Green
Write-Host ''

# ----------------------------------------------------------------------------
# 5. Call Supabase Management API
# ----------------------------------------------------------------------------
$apiUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"

$headers = @{
    'Authorization' = "Bearer $accessToken"
    'Content-Type'  = 'application/json'
}

$bodyObj  = @{ query = $sqlText }
$bodyJson = $bodyObj | ConvertTo-Json -Depth 10 -Compress

Write-Host '-->    Sending migration to Supabase Management API...' -ForegroundColor Cyan
Write-Host "       POST $apiUrl"
Write-Host ''

try {
    $response = Invoke-RestMethod `
        -Uri $apiUrl `
        -Method Post `
        -Headers $headers `
        -Body $bodyJson `
        -ErrorAction Stop

    Write-Host '[OK]   Migration applied' -ForegroundColor Green
    Write-Host ''

    # Response is an array of rows from the verification SELECT
    if ($response -and $response.Count -gt 0) {
        $stats = $response[0]
        $rootC = $stats.root_categories
        $subC  = $stats.sub_categories
        $attrs = $stats.total_attributes

        Write-Host '  +------------------------------------------+'
        Write-Host '  | Categories summary                       |'
        Write-Host '  +------------------------------------------+'
        Write-Host ('  | Root categories  : {0,-21}|' -f $rootC)
        Write-Host ('  | Sub categories   : {0,-21}|' -f $subC)
        Write-Host ('  | Total attributes : {0,-21}|' -f $attrs)
        Write-Host '  +------------------------------------------+'
        Write-Host ''

        if ([int]$rootC -ge 8 -and [int]$subC -ge 50) {
            Write-Host '[DONE] Migration applied successfully!' -ForegroundColor Green
            Write-Host ''
            Write-Host '       شوف الأقسام في الـ admin panel:'
            Write-Host '          https://madmonacairo.com/admin/categories' -ForegroundColor Cyan
        } else {
            Write-Host '[WARN] Row counts lower than expected.' -ForegroundColor Yellow
            Write-Host '       شوف الـ admin panel للتأكد.'
        }
    } else {
        Write-Host '[OK]   Migration sent. (No verification rows returned.)'
    }

} catch {
    Write-Host ''
    Write-Host '[FAIL] Migration failed:' -ForegroundColor Red
    Write-Host "       $($_.Exception.Message)" -ForegroundColor Red

    # Try to extract response body for more detail
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        Write-Host '       Response body:' -ForegroundColor Red
        Write-Host "       $($_.ErrorDetails.Message)" -ForegroundColor Red
    } elseif ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            $stream.Close()
            if ($errorBody) {
                Write-Host '       Response body:' -ForegroundColor Red
                Write-Host "       $errorBody" -ForegroundColor Red
            }
        } catch {}
    }

    Write-Host ''
    Write-Host '       لو المشكلة في الـ token، تأكد إنه فعلاً Personal Access Token (يبدأ بـ sbp_)' -ForegroundColor Yellow
    Write-Host '       وليس service_role key.' -ForegroundColor Yellow
    exit 1
}
