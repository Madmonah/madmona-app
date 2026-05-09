@echo off
REM ============================================================
REM  Madmona  -  Apply New Categories
REM  Copies the SQL to clipboard + opens Supabase SQL Editor.
REM  Just paste (Ctrl+V) and click RUN.
REM ============================================================

setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ====================================================
echo   Madmona  -  Add New Categories
echo ====================================================
echo.

set "SQL_FILE=%~dp0supabase\migrations\20260505000000_more_categories.sql"

if not exist "%SQL_FILE%" (
  echo [FAIL] SQL file not found:
  echo        %SQL_FILE%
  echo.
  pause
  exit /b 1
)

REM 1. Copy SQL to clipboard (PowerShell handles UTF-8 properly)
powershell -NoProfile -Command "Get-Content -LiteralPath '%SQL_FILE%' -Raw -Encoding UTF8 | Set-Clipboard"

if errorlevel 1 (
  echo [FAIL] Could not copy SQL to clipboard.
  pause
  exit /b 1
)

echo [OK]   الـ SQL اتنسخ في الـ clipboard
echo.

REM 2. Read project ref from .env.local and open Supabase SQL editor
powershell -NoProfile -Command "$line = Get-Content -LiteralPath '.env.local' -Encoding UTF8 | Where-Object { $_ -match 'NEXT_PUBLIC_SUPABASE_URL' } | Select-Object -First 1; if ($line -match 'https?://([a-z0-9-]+)\.supabase\.co') { $ref = $matches[1]; Start-Process \"https://supabase.com/dashboard/project/$ref/sql/new\" } else { Start-Process 'https://supabase.com/dashboard/project/_/sql/new' }"

echo [OK]   Supabase SQL Editor فتح في المتصفح
echo.
echo ====================================================
echo   الخطوات:
echo.
echo   1. ألصق (Ctrl + V)
echo   2. اضغط RUN (أو Ctrl + Enter)
echo   3. تأكد من النتيجة في الآخر:
echo        Root: 8, Sub: 60+, Attributes: 80+
echo.
echo   بعدين:
echo   https://madmonacairo.com/admin/categories
echo ====================================================
echo.

pause
