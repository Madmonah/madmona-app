@echo off
cd /d "%~dp0"
echo ==============================================
echo   PREMIUM REDESIGN — Visual Overhaul
echo ==============================================
echo.
echo   * Cairo + Inter fonts (Google Fonts)
echo   * Custom animations (slide-up, scale-in, shimmer)
echo   * Glassmorphism + premium shadows
echo   * Gradient mesh backgrounds
echo   * Home page redesigned with massive hero
echo   * Marketplace browse with glass header
echo   * Featured Listings cinematic
echo   * TopNav with scroll-aware blur
echo   * Premium typography (font-black, gradient text)
echo   * Skeleton loaders instead of spinners
echo.
pause
git add .
git commit -m "feat: premium visual overhaul — fonts, animations, glassmorphism, cinematic cards"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
) else (
  echo   PUSH FAILED. Check error above.
)
pause
