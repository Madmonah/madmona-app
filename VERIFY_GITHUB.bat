@echo off
cd /d C:\madmona-app

echo ============================================
echo  Verify GitHub state
echo ============================================
echo.

echo [1] Latest local commits:
git log --oneline -5
echo.

echo [2] What commit does GitHub have for main branch?
git ls-remote origin main
echo.

echo [3] Is local in sync with GitHub?
git fetch origin main
git log HEAD..origin/main --oneline
git log origin/main..HEAD --oneline
echo.

echo [4] If above shows nothing, local and GitHub are in sync.
echo.

echo [5] Forcing an empty commit + push to trigger Vercel rebuild:
git commit --allow-empty -m "chore: force Vercel rebuild for buffer-diagnostic endpoint"
git push origin main
echo.

echo Wait 90 seconds for Vercel deploy...
timeout /t 90 /nobreak

echo.
echo Testing endpoint:
curl -s -o nul -w "buffer-diagnostic: HTTP %%{http_code}\n" "https://www.madmonacairo.com/api/admin/buffer-diagnostic"
echo.
echo (HTTP 401 = SUCCESS - endpoint deployed)
echo (HTTP 404 = Vercel deploy failed or webhook broken)
echo.

pause
