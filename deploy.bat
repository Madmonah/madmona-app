@echo off
cd /d "%~dp0"
echo ================================================================
echo   Tier 3: PWA Push + Resend Emails + Image Optimization
echo ================================================================
echo.
echo   PWA PUSH NOTIFICATIONS (the complex one):
echo   * DB: push_subscriptions + notification_queue tables
echo   * DB triggers: auto-queue notifications on booking events
echo   * Service worker v2: push event handler + click handler
echo   * web-push library integration (lib/web-push.ts)
echo   * API routes:
echo     - POST /api/push/subscribe (save subscription)
echo     - POST /api/push/unsubscribe (remove)
echo     - GET/POST /api/push/process-queue (Vercel cron)
echo   * Client subscription helper (lib/push-subscription.ts)
echo   * UI: PushNotificationCard in /account page
echo   * Vercel cron: every minute processes notification queue
echo.
echo   RESEND EMAILS:
echo   * lib/email.ts with templates:
echo     - bookingConfirmationEmail
echo     - newBookingForSupplierEmail
echo     - welcomeEmail
echo   * Madmona-branded RTL Arabic email layout
echo   * Graceful degradation if RESEND_API_KEY missing
echo.
echo   IMAGE OPTIMIZATION:
echo   * next.config.mjs: remotePatterns for Supabase + Canva
echo   * AVIF + WebP formats
echo   * SmartImage component with fallback for unknown hosts
echo.
echo   DEPS ADDED:
echo   * web-push@3.6.7 + @types/web-push
echo   * resend@4.0.0
echo.
echo   IMPORTANT - MOHAMED MUST DO BEFORE PUSHES WORK:
echo   1. After this deploy, run: npm install
echo   2. Generate VAPID keys: npm run generate-vapid
echo   3. Add to .env.local AND Vercel:
echo      NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
echo      VAPID_PRIVATE_KEY=...
echo      VAPID_EMAIL=mailto:hello@madmonacairo.com
echo      CRON_SECRET=any-random-string-here
echo   4. (Optional) For emails, sign up at resend.com:
echo      RESEND_API_KEY=re_...
echo      EMAIL_FROM=Madmona ^<hello@madmonacairo.com^>
echo.
pause
git add .
git commit -m "feat: PWA push notifications + Resend emails + image optimization"
git push
echo.
if %ERRORLEVEL% EQU 0 (
  echo   DONE. Wait 1-2 min for Vercel.
  echo   Don't forget to add VAPID keys after deploy!
) else (
  echo   PUSH FAILED.
)
pause
