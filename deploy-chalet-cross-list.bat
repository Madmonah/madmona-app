@echo off
chcp 65001 >nul
echo ============================================================
echo   Madmona - Cross-list Chalets in Properties + Tourism
echo ============================================================
echo.
echo Changes:
echo   1. Added 'also_show_in' column to categories table
echo   2. Chalet (تحت سياحة) now also appears in Properties tab
echo   3. Marketplace filter shows cross-listed categories in subcategory pills
echo.
echo ============================================================

cd /d "C:\madmona-app"

echo.
echo [1] Status:
git status --short
echo.

echo [2] Staging changes...
git add -A

echo.
echo [3] Committing...
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "feat(marketplace): cross-list chalets in both Tourism and Properties tabs"
) else (
  echo No new changes to commit.
)

echo.
echo [4] Pushing to GitHub...
git push origin main

echo.
echo ============================================================
echo Done! After Vercel deploys (~2 min), the chalet listings
echo will appear in BOTH the سياحة tab AND the عقارات tab.
echo ============================================================
pause
