@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: COMPREHENSIVE MASTER ADMIN HQ
echo ================================================================
echo.
echo /admin/hq هو دلوقتي شامل كل حاجة في الادارة:
echo.
echo  10 TABS:
echo   1. لوحة القيادة - GMV + commission + bookings + reviews
echo   2. السوق - listings + suppliers + bookings + leads
echo   3. الـ Agents - 43 agent مع filter + run buttons
echo   4. إبداع - ads + reels + posts
echo   5. ذكاء البيانات - demand + fraud + pricing + qc
echo   6. نمو - partnerships + customers + photos + leads
echo   7. دعم - insights + complaints + emails
echo   8. تحسين ذاتي - prompt versions + recent runs
echo   9. تعاون - launch orchestrator + collabs + messages
echo  10. أدوات - quick links لـ 30+ صفحة admin
echo.
echo معلومات شاملة:
echo   - عمولة الشهر + إجمالي
echo   - GMV الشهر + إجمالي
echo   - حجوزات + توزيع status
echo   - مؤجرين معتمدين + معلّقين
echo   - إعلانات منشورة + مسودات
echo   - تقييمات + push subscribers + leads
echo.
git add .
git status --short
echo.
git commit -m "feat: comprehensive master HQ panel with full dashboard + marketplace + AI OS"
git push origin main
echo.
echo ================================================================
echo   DONE - افتح: madmonacairo.com/admin/hq
echo ================================================================
echo.
pause
