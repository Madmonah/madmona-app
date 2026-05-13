@echo off
REM ============================================================
REM  Quantum Leap V5 Deploy
REM  Wave 4: Phone capture + BookingHelper
REM  Wave 5: Customer recovery drafter
REM  Wave 6: AI Content Studio (Reels, TikTok, posts, stories)
REM ============================================================
setlocal enabledelayedexpansion
cd /d C:\madmona-app

echo.
echo ==========================================================
echo   QUANTUM LEAP DEPLOY V5
echo ==========================================================
echo   What's new in this wave:
echo     - BookingHelper widget (phone capture + concierge)
echo     - phone_captures table + RPC + admin section
echo     - booking_help_v1, ai_matchmaker_v1, ai_matchmaker_v2
echo       WhatsApp templates submitted to Meta (PENDING)
echo     - customer-recovery-drafter (AI WA recovery messages)
echo     - content-script-generator (Reels/TikTok/posts/stories)
echo     - weekly-content-plan cron (every Sunday 8 AM Cairo)
echo     - /admin/content-studio admin page UI
echo ==========================================================
echo.

REM ----------------------------------------------------------
REM Create content-studio directory and move staged file
REM ----------------------------------------------------------
if exist "_staged_content_studio_page.tsx" (
    if not exist "src\app\admin\content-studio" (
        mkdir "src\app\admin\content-studio"
        echo [+] Created src\app\admin\content-studio
    )
    move /Y "_staged_content_studio_page.tsx" "src\app\admin\content-studio\page.tsx" >nul
    if errorlevel 1 (
        echo [!] Failed to move staged page file
    ) else (
        echo [+] Moved _staged_content_studio_page.tsx to src\app\admin\content-studio\page.tsx
    )
) else (
    if exist "src\app\admin\content-studio\page.tsx" (
        echo [+] content-studio\page.tsx already in place
    ) else (
        echo [!] WARN: neither staged file nor final file exists
    )
)

REM ----------------------------------------------------------
REM Verify all files in place
REM ----------------------------------------------------------
if exist "src\components\BookingHelper.tsx" (
    echo [+] BookingHelper.tsx in place
) else (
    echo [!] WARN: BookingHelper.tsx missing
)

if exist "src\app\admin\content-studio\page.tsx" (
    echo [+] content-studio page in place
) else (
    echo [!] WARN: content-studio page missing
)

findstr /C:"import BookingHelper" "src\app\marketplace\[slug]\book\page.tsx" >nul
if errorlevel 1 (
    echo [!] WARN: BookingHelper not imported in booking page
) else (
    echo [+] BookingHelper imported in booking page
)

findstr /C:"phone_captures" "src\app\admin\command-center\page.tsx" >nul
if errorlevel 1 (
    echo [!] WARN: phone_captures section missing from command-center
) else (
    echo [+] phone_captures section in command-center
)

REM ----------------------------------------------------------
REM Stage and commit
REM ----------------------------------------------------------
echo.
echo --- Git status ---
git status --short
echo.

git add -A

git commit -m "feat(quantum-leap-v5): Content Studio + Wave 4 + Wave 5

WAVE 4 - Conversion rescue infrastructure:
- BookingHelper widget: floating phone capture + WhatsApp concierge
- phone_captures table + capture_phone RPC + admin section
- booking_help_v1 WhatsApp template (PENDING Meta)

WAVE 5 - Customer recovery:
- customer-recovery-drafter edge function (AI message draft)
- Runs every 6 hours via cron
- AI uses Claude Sonnet 4.6 for empathetic Egyptian Arabic messages

WAVE 6 - AI Content Studio:
- content_drafts table with full schema for Reels/TikTok/posts/stories
- content-script-generator edge function
  Generates: hook, script with timing, visual directions (shot-by-shot),
  caption, hashtags, CTA, thumbnail text, music suggestion, AI reasoning
- weekly-content-plan edge function
  Every Sunday 8 AM Cairo: drafts a 7-day content calendar
  (3 Reels + 5 TikToks + 2 posts + 3 stories)
- /admin/content-studio admin UI
  Format picker (reel/tiktok/post/story/thread/carousel)
  Intent + tone + audience + duration controls
  Status workflow: generated -> approved -> in_production -> published
  Copy buttons for script/caption/hashtags
  Status filters and expanded shot-by-shot view

WhatsApp templates submitted to Meta:
- booking_help_v1 (PENDING) - for phone captures
- madmona_ai_matchmaker_v1 (PENDING) - initial supplier outreach
- madmona_ai_matchmaker_v2 (PENDING, candidate) - 'wasalna leek bel AI' hook

auto-flip-default-template will activate v2 as default once Meta approves."

if errorlevel 1 (
    echo.
    echo [!] git commit had nothing to commit or failed
    echo Continuing to push pending commits anyway...
)

echo.
echo --- Pushing to origin/main ---
git push origin main

if errorlevel 1 (
    echo.
    echo [!] git push failed
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo  PUSHED. Test these URLs once Vercel rebuilds:
echo.
echo   1. Content Studio (AI generates Reels, TikTok, posts)
echo      https://madmonacairo.com/admin/content-studio
echo.
echo   2. Booking page (BookingHelper widget appears after 20-45s)
echo      https://madmonacairo.com/marketplace/listing-mp05vakz-oxyp/book
echo.
echo   3. Command Center (phone captures + recovery alerts)
echo      https://madmonacairo.com/admin/command-center
echo.
echo  All AI features ready. WhatsApp templates pending Meta.
echo ==========================================================
echo.
pause
