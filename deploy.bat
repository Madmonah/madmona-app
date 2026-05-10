@echo off
cd /d "%~dp0"
echo ================================================================
echo   AUTO REEL RENDERING via Vercel Cron + FFmpeg + @vercel/og
echo ================================================================
echo.
echo   ZERO SETUP REQUIRED (no Pexels, no GitHub secrets, no signup)
echo.
echo   PIPELINE:
echo   1. Edge Function /api/og/reel-scene generates Arabic-shaped PNG frames
echo      (Cairo font from Google Fonts, Madmona brand gradients + colors)
echo   2. Cron Function /api/cron/render-reels:
echo      - Pulls drafted reel scripts from Supabase
echo      - Generates 1 PNG per scene (hook + middles + CTA)
echo      - FFmpeg concats PNGs with fade transitions -^> MP4
echo      - Uploads to Supabase Storage (bucket: reels)
echo      - Updates reel_scripts.video_url + status='rendered'
echo.
echo   AUTOMATION:
echo   * Vercel cron: daily 5:30 AM UTC (7:30 AM Cairo)
echo   * Manual trigger: zorar in /admin/reels
echo.
echo   FILES ADDED:
echo   * src/app/api/og/reel-scene/route.tsx (Arabic text + branding)
echo   * src/app/api/cron/render-reels/route.ts (FFmpeg compositor)
echo   * src/app/admin/reels/components/RenderTrigger.tsx (UI button)
echo   * package.json (added ffmpeg-static dependency)
echo   * vercel.json (added daily cron schedule)
echo.
echo   Pushing to GitHub now...
echo.
git add .
git commit -m "feat: zero-setup reel renderer (vercel og + ffmpeg + supabase storage)" --allow-empty
git pull --rebase origin main
git push origin main
echo.
if %ERRORLEVEL% EQU 0 (
  echo.
  echo   ================================================================
  echo   DONE - Wait 2-3 min for Vercel build to install ffmpeg-static.
  echo   ================================================================
  echo.
  echo   THEN:
  echo   1. Open: https://www.madmonacairo.com/admin/reels
  echo   2. Click the green "ابدأ rendering" button
  echo   3. Wait 2-5 minutes (depending on number of reels)
  echo   4. Refresh page - videos appear with built-in player
  echo.
  echo   AUTO MODE:
  echo   * Vercel runs renderer daily at 7:30 AM Cairo automatically
  echo   * No further action needed.
) else (
  echo   PUSH FAILED.
)
pause
