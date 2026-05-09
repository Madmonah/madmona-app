@echo off
cd C:\madmona-app

echo ============================================
echo  Madmona Auto-Publisher + Buffer Deploy v3
echo ============================================
echo.

echo [1/5] Pulling latest from GitHub...
git pull origin main --no-edit
if errorlevel 1 (
    echo ERROR: git pull failed.
    pause
    exit /b 1
)
echo.

echo [2/5] Adding all new files...
git add -f src/lib/instagram.ts
git add -f src/lib/image-generator.ts
git add -f src/lib/buffer.ts
git add -f src/lib/agent-runners/auto-publisher.ts
git add -f src/lib/agent-runners/buffer-publisher.ts
git add -f src/lib/agent-runners/index.ts
git add -f src/app/api/agents/email-content-digest/route.ts
echo.

echo [3/5] Status check before commit:
git status --short
echo.

echo [4/5] Committing...
git commit -m "feat: auto-publisher + buffer-publisher + email-content-digest endpoint"
echo.

echo [5/5] Pushing to GitHub...
git push origin main

if errorlevel 1 (
    echo.
    echo ERROR: git push failed. See errors above.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  SUCCESS! Vercel will deploy in ~2 minutes
echo ============================================
echo.
echo Next steps:
echo  1. Wait 3 minutes for Vercel deploy
echo  2. Run TRIGGER_EMAIL.bat to get all 40 content
echo  3. Sign up at buffer.com and connect IG + FB
echo  4. Get Buffer access token and send to Claude
echo ============================================
pause
