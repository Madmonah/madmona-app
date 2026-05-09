@echo off
cd /d C:\madmona-app

echo ============================================
echo  PUSH BUFFER GRAPHQL - V2 (Force commit)
echo ============================================
echo.

echo [1/6] Show what is currently tracked vs not...
git status --short
echo.

echo [2/6] Force add the 3 modified/new files...
git add src/lib/buffer.ts
git add src/lib/agent-runners/buffer-publisher.ts
git add src/app/api/admin/buffer-diagnostic/route.ts
echo.

echo [3/6] Verify they are now staged...
git status --short
echo.

echo [4/6] Show diff summary...
git diff --cached --stat
echo.

echo [5/6] Commit (allow empty if needed)...
git commit -m "feat: Buffer GraphQL API v2 + 3-channel publisher (IG + FB Page + FB Group)"
echo.

echo [6/6] Push to GitHub...
git push origin main
if errorlevel 1 (
    echo.
    echo ERROR: git push failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Verifying files reached GitHub...
echo ============================================
timeout /t 5 /nobreak > nul

curl -s -o nul -w "buffer.ts on GitHub:                HTTP %%{http_code}\n" "https://raw.githubusercontent.com/Madmonah/madmona-app/main/src/lib/buffer.ts"
curl -s -o nul -w "buffer-publisher.ts on GitHub:     HTTP %%{http_code}\n" "https://raw.githubusercontent.com/Madmonah/madmona-app/main/src/lib/agent-runners/buffer-publisher.ts"
curl -s -o nul -w "buffer-diagnostic/route.ts on GH:  HTTP %%{http_code}\n" "https://raw.githubusercontent.com/Madmonah/madmona-app/main/src/app/api/admin/buffer-diagnostic/route.ts"

echo.
echo ============================================
echo  If all 3 show HTTP 200, Vercel is deploying
echo ============================================
pause
