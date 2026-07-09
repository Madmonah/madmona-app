@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
REM ============================================================
REM DEPLOY_REALESTATE_ALL.bat  (v3 — 9 Jul 2026)
REM   v2 fixes: git index.lock self-heal + error checks + log
REM   v3 adds: olx-scraper v3 deploy (for-sale ads) + auto-trigger
REM ============================================================

cd /d E:\madmona-app
set "LOG=deploy-realestate-log.txt"
echo ==== RUN %date% %time% ==== > "%LOG%"

echo.
echo ==========================================
echo   MADMONA — Real Estate Deploy (v3)
echo ==========================================

echo.
echo [0/5] Checking git lock...
if exist ".git\index.lock" (
    tasklist /FI "IMAGENAME eq git.exe" 2>nul | find /I "git.exe" >nul
    if not errorlevel 1 (
        echo   [X] A git process is STILL RUNNING. Close VS Code / GitHub Desktop
        echo       then run this file again.
        pause
        exit /b 1
    )
    del /f ".git\index.lock" >nul 2>&1
    if exist ".git\index.lock" (
        echo   [X] Could not delete .git\index.lock — run this file AS ADMINISTRATOR,
        echo       or delete it manually: E:\madmona-app\.git\index.lock
        pause
        exit /b 1
    )
    echo   [OK] Stale index.lock removed.
) else (
    echo   [OK] No lock.
)

echo.
echo [1/5] Vercel production deploy (1-2 min)...
where vercel >nul 2>&1
if errorlevel 1 (
    echo   [X] vercel CLI not found. Install once with:  npm i -g vercel
    pause
    exit /b 1
)
call vercel --prod --yes
if errorlevel 1 (
    echo.
    echo   [X] VERCEL DEPLOY FAILED — the site did NOT update.
    echo       Read the error above. Common fixes:
    echo         vercel login          (session expired)
    echo         vercel link           (project not linked)
    pause
    exit /b 1
)
echo   [OK] Site deployed. >> "%LOG%"
echo   [OK] Site is LIVE.

echo.
echo [2/5] Git commit...
git add -A . >> "%LOG%" 2>&1
if errorlevel 1 (
    echo   [X] git add FAILED. Details in %LOG% — most likely the lock came back.
    echo       Close VS Code and re-run this file.
    pause
    exit /b 1
)
git diff --cached --quiet
if errorlevel 1 (
    git commit -m "feat(real-estate): market page v2 - sahel area + more developers + sale/rent opportunities + olx-scraper v3" >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo   [X] git commit FAILED. Details in %LOG%.
        pause
        exit /b 1
    )
    echo   [OK] Committed.
) else (
    echo   [OK] Nothing new to commit (already committed before).
)

echo.
echo [3/5] Git push...
git push origin main >> "%LOG%" 2>&1
if errorlevel 1 (
    echo   [!] git push FAILED — but DON'T PANIC: the site is ALREADY LIVE (step 1).
    echo       Details in %LOG%. Fix later with: git push origin main
) else (
    echo   [OK] Pushed to GitHub.
)

echo.
echo [4/5] Edge functions (marid v5 + olx-scraper v3)...
where supabase >nul 2>&1
if errorlevel 1 (
    echo   [!] supabase CLI not found — skipped. Install once with:
    echo       npm i -g supabase   then   supabase login
) else (
    call supabase functions deploy marid-restaurant-agent >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo   [!] Marid deploy failed — details in %LOG%. Site is fine.
    ) else (
        echo   [OK] Marid v5 deployed.
    )
    call supabase functions deploy olx-scraper >> "%LOG%" 2>&1
    if errorlevel 1 (
        echo   [!] olx-scraper deploy failed — details in %LOG%.
    ) else (
        echo   [OK] olx-scraper v3 deployed.
    )
)

echo.
echo [5/5] Trigger FOR-SALE ads scrape (fills the sale tab, ~1 min)...
curl -s -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaGZseHB4dW53eWNiaXF1b2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjg5OTYsImV4cCI6MjA5MjkwNDk5Nn0.FvWxnwHpadlhgeime6wVX4WWuW097rccJ6yL9_PkFW0" "https://mjhflxpxunwycbiquoig.supabase.co/functions/v1/olx-scraper?start=28&count=8" >> "%LOG%" 2>&1
if errorlevel 1 (
    echo   [!] Scrape trigger failed — run again later, or it runs with the next cron.
) else (
    echo   [OK] Sale-ads scrape triggered — new sale leads land in cold_leads.
)

echo.
echo ==========================================
echo   DONE — check now:
echo   1) madmonacairo.com  (قسم البورصة تحت الأخبار)
echo   2) madmonacairo.com/real-estate/market
echo      - تاب الساحل الشمالي + فرص للبيع/للإيجار بالأسعار
echo   3) بعد السكرابر ما يخلص، قولي عشان أعمل refresh للفرص
echo   Full log: %LOG%
echo ==========================================
echo.
pause
