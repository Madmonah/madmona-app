@echo off
cd /d "C:\madmona-app"
echo.
echo ================================================================
echo   FIX: Removing @supabase/ssr dependency
echo ================================================================
echo.
echo CHANGES:
echo - supplier-action/route.ts: uses Bearer token instead of @supabase/ssr
echo - marketplace-suppliers/route.ts: uses Bearer token instead of @supabase/ssr
echo - This was the cause of the build failure on Vercel
echo.
git add -A
echo.
echo === Files to commit ===
git status --short
echo.
git commit -m "fix: remove @supabase/ssr dependency that was breaking the build"
git push origin main
echo.
echo ================================================================
echo  DONE! Wait 2 minutes then check Vercel
echo ================================================================
echo.
pause
