@echo off
echo ================================================================
echo   FORCE DEPLOY - AI Assistant
echo ================================================================
echo.

cd /d "C:\madmona-app"

echo === GIT STATUS BEFORE ADD ===
git status --short
echo.

echo === ADDING ALL FILES (-A flag) ===
git add -A
echo.

echo === GIT STATUS AFTER ADD ===
git status --short
echo.

echo === LIST AI ASSISTANT FILES ON DISK ===
if exist "src\app\admin\ai-assistant\page.tsx" (
  echo [OK] src\app\admin\ai-assistant\page.tsx EXISTS
) else (
  echo [MISSING] src\app\admin\ai-assistant\page.tsx
)
if exist "src\app\api\admin\ai-assistant\route.ts" (
  echo [OK] src\app\api\admin\ai-assistant\route.ts EXISTS
) else (
  echo [MISSING] src\app\api\admin\ai-assistant\route.ts
)
echo.

echo === COMMIT ===
git commit -m "feat: AI Assistant chat + parser fixes"
echo.

echo === PUSH ===
git push origin main
echo.

echo ================================================================
echo   DONE - Check Vercel for build
echo ================================================================
pause
