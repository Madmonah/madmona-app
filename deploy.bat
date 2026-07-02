@echo off
chcp 65001 >nul
REM ============================================
REM  MADMONA - DEPLOY.bat  (شغّله من أي مكان)
REM  بيروح للمشروع على درايف E ويشغّل ديبلوي المشروع
REM ============================================
cd /d E:\madmona-app
if errorlevel 1 (
  echo [X] مش لاقي E:\madmona-app - اتأكد ان درايف E متوصل
  pause
  exit /b 1
)

if exist "E:\madmona-app\DEPLOY.bat" (
  REM لو ده نفس الملف اللي جوه المشروع هيكمل تحت عادي،
  REM ولو ده نسخة الديسكتوب هينده على بتاع المشروع
  if /i not "%~dp0"=="E:\madmona-app\" (
    call "E:\madmona-app\DEPLOY.bat"
    exit /b %errorlevel%
  )
)

REM ===== الديبلوي المباشر (Vercel CLI - مش git push) =====
echo.
echo ============================================================
echo    MADMONA - DEPLOY to madmonacairo.com (Vercel CLI)
echo ============================================================
echo Building and deploying... 2-4 minutes
echo.
call npx vercel deploy --prod --yes
if errorlevel 1 (
  echo [X] الديبلوي فشل - شوف الرسالة فوق
  pause
  exit /b 1
)
echo.
echo [OK] Deployed to madmonacairo.com
pause
