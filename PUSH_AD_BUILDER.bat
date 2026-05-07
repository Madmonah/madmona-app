@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: Direct Listing Ad Pages + Ad Builder + Auto-WhatsApp
echo ================================================================
echo.
git add .
git status --short
echo.
git commit -m "feat: direct listing ad pages + ad builder + auto-WhatsApp + Meta Pixel Lead event"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo NEW capabilities:
echo   - madmonacairo.com/ad-listing/[slug] = page per listing for ads
echo   - madmonacairo.com/admin/ad-builder  = generate ad URLs visually
echo   - Auto-WhatsApp greeting for high-priority leads
echo   - Meta Pixel "Lead" event fires on form submit
echo.
echo To activate Meta Pixel:
echo   1. Get Pixel ID from Meta Events Manager
echo   2. In Vercel: add NEXT_PUBLIC_META_PIXEL_ID = your_id
echo   3. Redeploy
echo.
pause
