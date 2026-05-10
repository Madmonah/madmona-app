@echo off
cd /d "%~dp0"
echo ================================================================
echo   Admin Dashboard: External Services Section
echo ================================================================
echo.
echo   ADDED: "الخدمات الخارجية" section in /admin/dashboard
echo   * Resend Emails (سجل الإيميلات المرسلة)
echo   * Vercel (Deployments + Logs)
echo   * Supabase (DB + Edge Functions)
echo   * Cloudflare (DNS + CDN)
echo   * GitHub Repo
echo   * Meta Business (إعلانات + WhatsApp)
echo   * Canva
echo   * Anthropic Console
echo.
echo   Affected files:
echo   * src/app/admin/dashboard/page.tsx
echo.
echo   Pushing to GitHub now...
echo.
echo   --- 1) Stage and commit any local changes ---
git add .
git commit -m "feat: add External Services section to admin dashboard" --allow-empty
echo.
echo   --- 2) Pull remote with rebase ---
git pull --rebase origin main
echo.
echo   --- 3) Push ---
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
