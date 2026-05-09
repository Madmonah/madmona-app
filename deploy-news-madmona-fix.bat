@echo off
chcp 65001 >nul
echo ============================================================
echo   Madmona News Feed Fix - Deploy
echo ============================================================
echo.
echo Changes:
echo   1. Date filter: drops items older than 14 days
echo   2. Madmona-branded SVG fallback images (deep green + gold)
echo   3. Sort by recency before mixing
echo   4. Refresh-time bump on failure (no more stuck pools)
echo.
echo ============================================================

cd /d "C:\madmona-app"

echo.
echo [1/3] Committing changes...
git add src/app/api/news-feed/route.ts
git commit -m "fix(news): 14-day recency filter + Madmona-branded SVG fallbacks"

echo.
echo [2/3] Pushing to GitHub...
git push origin main

echo.
echo [3/3] Vercel auto-deploys from main branch.
echo Wait ~2 minutes then visit: https://madmonacairo.com
echo.
echo The news widget will:
echo   - Show only items from the last 14 days
echo   - Use deep-green Madmona-branded fallbacks instead of Unsplash
echo   - Refresh automatically every 3 minutes
echo.
echo ============================================================
echo Done!
echo ============================================================
pause
