@echo off
chcp 65001 >nul
title Madmona Deploy - Phases E+F+G+UX+X+Y
color 0A

echo.
echo  ============================================================
echo   Madmona Deploy - Phases E+F+G+UX+X+Y
echo   May 18 2026
echo.
echo   Wizard DB-driven + grouping + change-cat UX
echo   Attributes step + service add-ons + track-aware copy
echo   Daily messages + bank transfer payment box
echo   Pricing label audit fill
echo  ============================================================
echo.

cd /d C:\madmona-app

echo  [1/4] Staging files...
echo  ------------------------------------------------------------
git add src/app/page.tsx
git add src/app/add-listing/page.tsx
git add src/app/add-listing/AddListingClient.tsx
git add "src/app/account/bookings/[id]/page.tsx"
git add src/app/api/listing-drafts/route.ts
git add src/app/api/listing-drafts/attributes/route.ts
git add src/app/api/daily-messages/route.ts
git add src/app/api/payment/instapay/route.ts
git add src/components/retention/DailyMessageCard.tsx
git add src/components/payment/InstaPayPaymentBox.tsx

echo.
echo  [2/4] Files staged:
echo  ------------------------------------------------------------
git diff --cached --name-only

echo.
echo  [3/4] Committing...
echo  ------------------------------------------------------------
git commit -m "Phase E+F+G+UX+X+Y: wizard DB-driven (groups, change-cat UX, attributes step), daily messages, bank transfer box, track-aware pricing copy, service add-ons, pricing labels audit fill"

if errorlevel 1 (
  echo.
  echo  NOTE: commit returned non-zero.
  echo  If you see "nothing to commit, working tree clean" above,
  echo  the commit was already done previously - continuing.
  echo.
)

echo.
echo  [4/4] Pushing to origin/main...
echo  ------------------------------------------------------------
echo  (Vercel will auto-deploy from this push via GitHub webhook)
echo.
git push origin main

if errorlevel 1 (
  echo.
  echo  ERROR: git push failed.
  echo  Most common reason: auth - run 'gh auth login' or check Git creds.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo   PUSH DONE
echo  ============================================================
echo.
echo   Vercel will auto-deploy in ~2 minutes via GitHub webhook.
echo   Check progress at:  https://vercel.com/dashboard
echo.
echo   AFTER VERCEL FINISHES BUILDING:
echo.
echo   1. Test /add-listing with a service category
echo      (e.g., mazoun)  Should say "بكام بتقدم الخدمة؟"
echo                       + addon builder appears
echo.
echo   2. Test /add-listing with a rental (e.g., chalet)
echo      Should still say "حضرتك بتأجره بكام؟"
echo.
echo   3. Create test booking, visit /account/bookings/[id]
echo      Should show "ادفع بالتحويل البنكي" box
echo.
echo   4. Visit home page
echo      Should show daily message card above news
echo.
echo  ============================================================
echo.
pause
