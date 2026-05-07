@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   FIXING: Image Upload (high-res photos failing)
echo ================================================================
echo.
echo What was wrong:
echo   1. Client limit: 5MB hardcoded (modern phone photos are 8-15MB)
echo   2. Storage bucket: 5MB hardcoded server limit
echo   3. No HEIC support (iPhone default format)
echo.
echo What's fixed:
echo   1. Client limit: 25MB + auto-compression to 1920px / 85%% quality
echo   2. Storage bucket: ALREADY UPDATED to 25MB + HEIC/HEIF allowed
echo   3. Smart compression: only compresses if needed, keeps original if smaller
echo   4. Visual feedback: "Compressed from 12MB to 2.1MB" badge on each photo
echo   5. Better error messages with actual file sizes
echo.
git add .
git status --short
echo.
git commit -m "fix: image upload allows 25MB + auto-compression + HEIC support (urgent customer fix)"
git push origin main
echo.
echo ================================================================
echo   DONE - Vercel deploy in 2-3 min
echo ================================================================
echo.
echo Test after deploy:
echo   1. Go to /supplier/marketplace/new
echo   2. Try uploading a high-res photo (10MB+)
echo   3. Should auto-compress and upload successfully
echo.
pause
