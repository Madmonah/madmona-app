@echo off
cd /d "%~dp0"
echo ================================================================
echo   Resend Custom Domain: noreply@madmonacairo.com
echo ================================================================
echo.
echo   CHANGE: Email FROM updated
echo   * Was: Madmona ^<onboarding@resend.dev^>
echo   * Now: Madmona ^<noreply@madmonacairo.com^>
echo.
echo   Resend domain madmonacairo.com is now VERIFIED.
echo   DNS records added auto via Cloudflare integration.
echo   Recipient redirect to admin removed (sends to actual users now).
echo.
echo   Affected files:
echo   * src/lib/email.ts
echo.
echo   Pushing to GitHub now...
echo.
echo   --- git status ---
git status -s
echo.
echo   --- git remote ---
git remote -v
echo.
git add .
git commit -m "feat: switch Resend FROM to verified domain noreply@madmonacairo.com" --allow-empty
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED.
)
pause
