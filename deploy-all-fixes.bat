@echo off
cd /d "%~dp0"
echo ================================================================
echo   Madmona - Deploy ALL Pending Fixes (Comprehensive)
echo ================================================================
echo.
echo   This script commits and pushes EVERYTHING accumulated:
echo.
echo   SECURITY:
echo   [1] Untrack leaked REMOVE_LISTING.ps1 + .gitignore
echo       (file sanitized to read from .env.local)
echo.
echo   DATABASE:
echo   [2] Migration: SECURITY DEFINER on booking notification triggers
echo       (already applied to prod — this is the audit trail)
echo.
echo   BOOKING UX:
echo   [3] Modal-based cancel/reject (replaces prompt/confirm — fixes
echo       ~2.4s INP issue) on /bookings/[id]
echo.
echo   CRON:
echo   [4] GitHub Action URL: apex -^> www, curl -L
echo       (fixes the 307 redirect that's been spamming your email)
echo.
echo   404 FIXES:
echo   [5] /spaces page (was 404 despite being in Terms)
echo   [6] /supplier page (was 404, now redirects to dashboard)
echo.
echo   UI FIXES:
echo   [7] Gallery counter on listing detail (was showing "2/1")
echo   [8] Signup phone placeholder (had your personal number)
echo   [9] Login phone placeholder (had your personal number)
echo   [10] Broken image fallback in /account/bookings
echo   [11] Hero text size — reduced so "خدمتك" doesn't overflow
echo   [12] Collections "كل اللي يتأجر" — fixed line wrapping
echo        ("ي" was orphaned in some viewports)
echo   [13] Admin "ضيف listing" -^> "أضف خدمة" (Arabic only)
echo.
echo   --------------------------------------------------------------
echo   STILL ON YOU AFTER PUSH:
echo.
echo   * Rotate Supabase JWT signing key (the leaked one is in git
echo     history — must be invalidated):
echo     https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/settings/jwt
echo.
echo   * Verify GitHub Action passes after this deploys:
echo     https://github.com/Madmonah/madmona-app/actions
echo.
pause
echo.
echo ================================================================
echo   Untracking leaked files
echo ================================================================
git rm --cached REMOVE_LISTING.ps1 REMOVE_LISTING.bat 2^>nul
echo.
echo ================================================================
echo   Staging all fixes
echo ================================================================
git add .gitignore
git add REMOVE_LISTING.ps1
git add supabase/migrations/20260430000009_fix_notification_trigger_security.sql
git add src/app/bookings/[id]/page.tsx
git add .github/workflows/process-notifications.yml
git add src/app/spaces/page.tsx
git add src/app/supplier/page.tsx
git add src/app/marketplace/[slug]/page.tsx
git add src/app/auth/signup/page.tsx
git add src/app/auth/login/page.tsx
git add src/app/account/bookings/page.tsx
git add src/app/page.tsx
git add src/app/admin/listings/page.tsx
echo.
echo ================================================================
echo   Committing and pushing
echo ================================================================
git commit -m "fix: comprehensive site audit — security, RLS, INP, 404s, UI polish (13 fixes)"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo.
  echo   ================================================================
  echo   ALL FIXES PUSHED.
  echo   ================================================================
  echo.
  echo   Vercel will deploy in ~1-2 minutes. Then:
  echo   1. Test customer booking - should work now (RLS fix)
  echo   2. Test cancel/reject button - modal not native dialog
  echo   3. Visit /spaces and /supplier - redirect, no more 404
  echo   4. Open any listing - gallery counter shows "1/2" correctly
  echo   5. GitHub Action should return 200 next run, not 307
  echo.
  echo   Don't forget to rotate the Supabase JWT signing key.
) else (
  echo.
  echo   PUSH FAILED. Check error above.
)
echo.
pause
