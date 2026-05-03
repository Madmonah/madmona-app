@echo off
cd /d "%~dp0"
echo ================================================================
echo   Booking Diagnostic Patch — Surface Real Errors
echo ================================================================
echo.
echo   PROBLEM:
echo   When user clicks confirm booking, generic error appears:
echo   "حصل خطأ، حاول تاني" — hiding the actual Supabase error.
echo.
echo   ROOT CAUSE:
echo   Supabase PostgrestError is not "instanceof Error",
echo   so the catch blocks fell through to the fallback message
echo   on both the client (book page) and the API routes.
echo.
echo   FIX (4 files):
echo   * src/app/marketplace/[slug]/book/page.tsx
echo     - Extract message + details + hint + code from any thrown object
echo   * src/app/api/bookings/route.ts (lounge booking API)
echo     - Return real Supabase error in response (not "Failed to ...")
echo   * src/app/api/unit-bookings/route.ts (marketplace unit booking API)
echo     - Same: return real Supabase error
echo   * src/components/SinglePlanReserve.tsx
echo     - Surface real network/upload error instead of generic message
echo.
echo   AFTER DEPLOY:
echo   1. Try the failing booking again
echo   2. The exact error will now appear on screen, e.g.:
echo      - "new row violates row-level security policy [42501]"
echo      - "violates foreign key constraint ... [23503]"
echo      - "duplicate key value violates ... [23505]"
echo   3. Send me the exact message — that tells us the real bug.
echo.
echo   NOTE: This is a diagnostic patch. Once we identify and fix
echo   the underlying bug, we may want to revert to safer/cleaner
echo   user-facing messages in production.
echo.
pause
git add .
git commit -m "diagnostic: surface real Supabase errors in booking flows"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo   Then test the booking flow again.
) else (
  echo   PUSH FAILED. Check the error above.
)
pause
