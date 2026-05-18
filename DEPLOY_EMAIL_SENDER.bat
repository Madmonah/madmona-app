@echo off
chcp 65001 >nul
title Madmona - Deploy email-sender Edge Function
color 0E

echo.
echo  ============================================================
echo   Madmona - Deploy email-sender Edge Function (Resend)
echo  ============================================================
echo.

cd /d C:\madmona-app

echo  Checking Supabase CLI...
where supabase >nul 2>&1
if errorlevel 1 (
  echo.
  echo  ERROR: Supabase CLI not found.
  echo  Install: npm install -g supabase
  echo  OR use Dashboard option below.
  echo.
  goto :dashboard
)

echo  Found Supabase CLI ^

echo.
echo  Deploying email-sender...
supabase functions deploy email-sender --project-ref mjhflxpxunwycbiquoig
if errorlevel 1 (
  echo.
  echo  Deploy failed. Run "supabase login" first if needed.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo   DEPLOYED ^
echo.
echo   NEXT: Set secrets in Supabase Dashboard:
echo     1. https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/settings/functions
echo     2. Add secret: RESEND_API_KEY = re_xxx
echo     3. Optional: MADMONA_FROM_EMAIL, MADMONA_ADMIN_FROM_EMAIL
echo.
echo   Then emails will flow automatically.
echo  ============================================================
echo.
pause
goto :end

:dashboard
echo.
echo  ============================================================
echo   ALTERNATIVE: Deploy via Supabase Dashboard
echo  ============================================================
echo.
echo  1. Open https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/functions
echo  2. Click "Create a new function"
echo  3. Name: email-sender
echo  4. Paste contents of:
echo       C:\madmona-app\supabase\functions\email-sender\index.ts
echo  5. Click "Deploy function"
echo  6. Settings ^> Edge Functions ^> Secrets:
echo       RESEND_API_KEY = re_xxx
echo.
pause

:end
