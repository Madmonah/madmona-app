@echo off
cd /d "%~dp0"
echo ================================================================
echo   Fix INP / Slow Cancel Button on Booking Detail
echo ================================================================
echo.
echo   PROBLEM:
echo   The red Cancel/Reject buttons on /bookings/[id] were blocking
echo   the UI for ~2.4 seconds per click. Two causes:
echo.
echo   1. Native prompt() and confirm() pause the JS main thread
echo      synchronously while the dialog is open. INP measures from
echo      the click until the next paint, so it counts that pause.
echo   2. updateBookingStatus did UPDATE then a separate SELECT to
echo      reload the row -- two network roundtrips when one would do.
echo.
echo   FIX:
echo   1. Replaced prompt/confirm with a real React modal -- non-blocking,
echo      better UX, supports Arabic placeholder, validates trimmed input.
echo      Reused for BOTH supplier reject and customer cancel paths.
echo   2. Switched UPDATE to use .select(...).maybeSingle() -- one
echo      roundtrip returns the enriched row directly. No more separate
echo      SELECT after the update.
echo.
echo   FILES CHANGED:
echo   * src/app/bookings/[id]/page.tsx
echo.
echo   Note: /supplier/marketplace/bookings/[id] already used a proper
echo   inline form (no prompt). No change needed there.
echo.
pause
echo.
echo Staging the file...
git add src/app/bookings/[id]/page.tsx
git commit -m "perf: replace prompt/confirm with modal on booking cancel; single-roundtrip update (fixes ~2.4s INP)"
echo.
echo Pushing to GitHub...
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   PUSHED. Vercel will build and deploy automatically.
  echo   After deploy: re-run Lighthouse / DevTools Performance to confirm
  echo   the INP measurement drops below 200ms.
) else (
  echo   PUSH FAILED. Check the error above.
)
pause
