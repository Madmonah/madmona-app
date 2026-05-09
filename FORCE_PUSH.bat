@echo off
cd /d "C:\madmona-app"
echo.
echo === Checking what git sees ===
git status --short
echo.
echo === Files that exist ===
dir src\app\admin\sup\page.tsx 2>nul
echo.
echo === Last commit ===
git log -1 --oneline
echo.
echo === Trying to add the new file specifically ===
git add -f src/app/admin/sup/page.tsx
git add -f src/app/admin/dashboard/page.tsx
git add -f src/app/admin/marketplace-suppliers/page.tsx
git add -f src/app/api/admin/marketplace-suppliers/route.ts
git status --short
echo.
echo === Committing ===
git commit -m "fix: dashboard + suppliers using Supabase RPCs"
echo.
echo === Pushing ===
git push origin main
echo.
pause
