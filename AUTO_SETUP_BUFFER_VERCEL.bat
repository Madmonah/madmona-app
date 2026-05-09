@echo off
setlocal enabledelayedexpansion
cd /d "C:\madmona-app"

echo ================================================================
echo   AUTO-SETUP: Buffer env vars in Vercel + Redeploy
echo ================================================================
echo.

REM Check if Vercel CLI is installed
where vercel >nul 2>nul
if errorlevel 1 (
  echo Installing Vercel CLI...
  call npm install -g vercel
)

echo.
echo STEP 1: Login to Vercel (if not already logged in)
echo --------------------------------------------------
call vercel whoami
if errorlevel 1 (
  echo Please login:
  call vercel login
)
echo.

echo STEP 2: Link project (if not linked)
echo --------------------------------------------------
if not exist ".vercel\project.json" (
  echo Linking madmona-app project...
  call vercel link --yes
)
echo.

echo STEP 3: Add 5 environment variables to all environments
echo --------------------------------------------------
echo.
echo Adding BUFFER_ACCESS_TOKEN (sensitive)...
echo sn9ouybBU6jBx7i5_j-lrDs47n4T7KSzOG9MlX2Rp_S | call vercel env add BUFFER_ACCESS_TOKEN production
echo sn9ouybBU6jBx7i5_j-lrDs47n4T7KSzOG9MlX2Rp_S | call vercel env add BUFFER_ACCESS_TOKEN preview
echo sn9ouybBU6jBx7i5_j-lrDs47n4T7KSzOG9MlX2Rp_S | call vercel env add BUFFER_ACCESS_TOKEN development
echo.

echo Adding BUFFER_ORGANIZATION_ID...
echo 69fdaa0b62b7b2a67ceb40c6 | call vercel env add BUFFER_ORGANIZATION_ID production
echo 69fdaa0b62b7b2a67ceb40c6 | call vercel env add BUFFER_ORGANIZATION_ID preview
echo 69fdaa0b62b7b2a67ceb40c6 | call vercel env add BUFFER_ORGANIZATION_ID development
echo.

echo Adding BUFFER_INSTAGRAM_CHANNEL_ID...
echo 69fdaa9d5c4c051afa22bbad | call vercel env add BUFFER_INSTAGRAM_CHANNEL_ID production
echo 69fdaa9d5c4c051afa22bbad | call vercel env add BUFFER_INSTAGRAM_CHANNEL_ID preview
echo 69fdaa9d5c4c051afa22bbad | call vercel env add BUFFER_INSTAGRAM_CHANNEL_ID development
echo.

echo Adding BUFFER_FACEBOOK_PAGE_CHANNEL_ID...
echo 69fdaaca5c4c051afa22bc45 | call vercel env add BUFFER_FACEBOOK_PAGE_CHANNEL_ID production
echo 69fdaaca5c4c051afa22bc45 | call vercel env add BUFFER_FACEBOOK_PAGE_CHANNEL_ID preview
echo 69fdaaca5c4c051afa22bc45 | call vercel env add BUFFER_FACEBOOK_PAGE_CHANNEL_ID development
echo.

echo Adding BUFFER_FACEBOOK_GROUP_CHANNEL_ID...
echo 69fdab9a5c4c051afa22bf1f | call vercel env add BUFFER_FACEBOOK_GROUP_CHANNEL_ID production
echo 69fdab9a5c4c051afa22bf1f | call vercel env add BUFFER_FACEBOOK_GROUP_CHANNEL_ID preview
echo 69fdab9a5c4c051afa22bf1f | call vercel env add BUFFER_FACEBOOK_GROUP_CHANNEL_ID development
echo.

echo STEP 4: Deploy code + trigger redeploy with new env vars
echo --------------------------------------------------
git add .
git commit -m "feat: rewrite Buffer client for GraphQL API v2 + 3-channel auto-publisher"
git push origin main
echo.

echo ================================================================
echo   DONE!
echo ================================================================
echo.
echo Vercel will redeploy automatically with new env vars in 2-3 min.
echo.
echo TEST AFTER DEPLOY:
echo   https://madmonacairo.com/api/admin/buffer-diagnostic?pw=YOUR_ADMIN_PW
echo.
pause
