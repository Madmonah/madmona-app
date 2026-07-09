@echo off
chcp 65001 >nul
echo ================================================
echo  Madmona - Deploy: OG preview image redesign
echo ================================================
cd /d %~dp0

echo.
echo [1/4] Staging only the 2 changed files...
git add "public/og-image-v2.png" "src/app/opengraph-image.tsx"
git status --short

echo.
echo [2/4] Committing...
git commit -m "og-image: new social preview design (logo + buttons)"

echo.
echo [3/4] Pushing to origin/main...
git push origin main

echo.
echo [4/4] Done.
echo ================================================
echo  Pushed. If this repo is linked to Vercel Git
echo  integration, a deploy will start automatically.
echo  Check status at: https://vercel.com/dashboard
echo ================================================
pause
