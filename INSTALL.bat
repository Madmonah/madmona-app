@echo off
REM ============================================================================
REM   Madmona — Listing-First Signup: ONE-CLICK INSTALL
REM
REM   What this does (everything automatic):
REM     1. Verifies you're in C:\madmona-app
REM     2. Copies all new files into the project
REM     3. Updates navigation: /supplier/register -> /add-listing
REM     4. Injects <MadmonaListingClaimer /> into the root layout
REM     5. Runs deploy.bat
REM
REM   How to use:
REM     - Extract this folder anywhere
REM     - Move the WHOLE folder into C:\madmona-app (so it sits next to deploy.bat)
REM     - Double-click INSTALL.bat
REM ============================================================================

chcp 65001 > nul
setlocal EnableDelayedExpansion

echo.
echo ================================================================
echo   MADMONA - LISTING-FIRST INSTALL
echo ================================================================
echo.

REM --- 0. Sanity check: we should be in the project root
if not exist "app" (
  echo  [X] Cant find folder "app" here.
  echo      Run INSTALL.bat from C:\madmona-app, NOT from a subfolder.
  echo      Current location: %CD%
  pause
  exit /b 1
)
if not exist "package.json" (
  echo  [X] Cant find package.json — youre not in the project root.
  pause
  exit /b 1
)
if not exist "deploy.bat" (
  echo  [!] Note: deploy.bat not found in this folder.
  echo      We will still install everything, but you must deploy manually.
)

echo  [OK] Project root confirmed: %CD%
echo.

REM --- 1. Find the source files (they should be in a subfolder next to us)
set "SRC=%~dp0madmona-add-listing"
if not exist "%SRC%\app" (
  echo  [X] Cant find source files at: %SRC%\app
  echo      Make sure the "madmona-add-listing" folder is here.
  pause
  exit /b 1
)
echo  [OK] Source files found at: %SRC%
echo.

REM --- 2. Copy files
echo  [STEP 1/4] Copying files...
xcopy /Y /Q /S /I "%SRC%\app" "app" > nul
if errorlevel 1 (
  echo  [X] xcopy failed for app folder.
  pause
  exit /b 1
)
xcopy /Y /Q /S /I "%SRC%\components" "components" > nul 2>&1
echo  [OK] Files copied:
echo       - app\add-listing\
echo       - app\admin\listing-drafts\
echo       - app\api\listing-drafts\
echo       - app\api\admin\listing-drafts\
echo       - components\MadmonaListingClaimer.tsx
echo.

REM --- 3. Update navigation: replace /supplier/register -> /add-listing
echo  [STEP 2/4] Updating navigation links...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$count = 0; ^
   $files = Get-ChildItem -Path 'app','components' -Recurse -Include *.tsx,*.ts,*.jsx,*.js -ErrorAction SilentlyContinue ^| Where-Object { $_.FullName -notlike '*add-listing*' -and $_.FullName -notlike '*listing-drafts*' }; ^
   foreach ($f in $files) { ^
     $content = Get-Content $f.FullName -Raw -Encoding UTF8; ^
     if ($content -match '/supplier/register') { ^
       $new = $content -replace 'href=\"/supplier/register\"', 'href=\"/add-listing\"'; ^
       $new = $new -replace \"href='/supplier/register'\", \"href='/add-listing'\"; ^
       $new = $new -replace '\"/supplier/register\"', '\"/add-listing\"'; ^
       $new = $new -replace \"'/supplier/register'\", \"'/add-listing'\"; ^
       if ($new -ne $content) { ^
         Set-Content -Path $f.FullName -Value $new -NoNewline -Encoding UTF8; ^
         Write-Host ('       [updated] ' + $f.FullName.Substring((Get-Location).Path.Length + 1)); ^
         $count++; ^
       } ^
     } ^
   }; ^
   Write-Host ('  [OK] Updated ' + $count + ' file(s)')"
echo.

REM --- 4. Inject <MadmonaListingClaimer /> into the root layout
echo  [STEP 3/4] Injecting MadmonaListingClaimer into root layout...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$layoutPaths = @('app\layout.tsx','app\layout.jsx','src\app\layout.tsx','app\(main)\layout.tsx'); ^
   $found = $false; ^
   foreach ($p in $layoutPaths) { ^
     if (Test-Path $p) { ^
       $found = $true; ^
       $content = Get-Content $p -Raw -Encoding UTF8; ^
       if ($content -match 'MadmonaListingClaimer') { ^
         Write-Host ('       [skip] Already integrated in: ' + $p); ^
         break; ^
       } ^
       $importLine = \"import MadmonaListingClaimer from '@/components/MadmonaListingClaimer';`r`n\"; ^
       if ($content -notmatch \"from '@/components/MadmonaListingClaimer'\") { ^
         $content = $content -replace '(^|\n)(import [^\n]+\n)+', ('$0' + $importLine); ^
       } ^
       if ($content -match '<body[^>]*>') { ^
         $content = [regex]::Replace($content, '(<body[^>]*>)', '$1`r`n        <MadmonaListingClaimer />'); ^
       } else { ^
         Write-Host '       [!] Could not find <body> in layout. Add <MadmonaListingClaimer /> manually.'; ^
       } ^
       Set-Content -Path $p -Value $content -NoNewline -Encoding UTF8; ^
       Write-Host ('       [updated] ' + $p); ^
       break; ^
     } ^
   }; ^
   if (-not $found) { ^
     Write-Host '       [!] Could not find app/layout.tsx. Add this manually to your root layout:'; ^
     Write-Host '            import MadmonaListingClaimer from ''@/components/MadmonaListingClaimer'';'; ^
     Write-Host '            <MadmonaListingClaimer /> inside <body>'; ^
   } ^
   Write-Host '  [OK] Layout injection complete'"
echo.

REM --- 5. Verify env vars
echo  [STEP 4/4] Verifying environment variables...
set "ENV_OK=1"
if not exist ".env.local" (
  echo       [!] .env.local not found. Create it with:
  echo            NEXT_PUBLIC_SUPABASE_URL=https://mjhflxpxunwycbiquoig.supabase.co
  echo            NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  echo            SUPABASE_SERVICE_ROLE_KEY=...
  set "ENV_OK=0"
) else (
  findstr /C:"SUPABASE_SERVICE_ROLE_KEY" .env.local > nul
  if errorlevel 1 (
    echo       [!] SUPABASE_SERVICE_ROLE_KEY missing in .env.local!
    echo            Add it from Supabase Dashboard -^> Settings -^> API
    set "ENV_OK=0"
  ) else (
    echo  [OK] .env.local has SUPABASE_SERVICE_ROLE_KEY
  )
)
echo.

echo ================================================================
echo   INSTALL COMPLETE
echo ================================================================
echo.
if "%ENV_OK%"=="0" (
  echo  [WARN] Fix the .env.local issues above BEFORE deploying.
  echo.
  pause
  exit /b 0
)

echo  Ready to deploy. Press any key to run deploy.bat now,
echo  or close this window if you want to review changes first.
pause > nul

if exist "deploy.bat" (
  echo.
  echo  Running deploy.bat...
  echo.
  call deploy.bat
) else (
  echo.
  echo  [!] deploy.bat not found. Run your normal deploy command now.
)

echo.
echo ================================================================
echo   DONE. After deploy finishes, test:
echo     - https://madmonacairo.com/add-listing
echo     - https://madmonacairo.com/admin/listing-drafts
echo     - Click the gold tab above News on the homepage
echo ================================================================
pause
