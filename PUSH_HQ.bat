@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: MASTER ADMIN PANEL - /admin/hq
echo ================================================================
echo.
echo NEW SINGLE-PAGE PANEL:
echo   /admin/hq = الموقف ده كله في صفحة واحدة
echo.
echo 9 TABS:
echo   1. نظرة عامة - tiles + alerts + top insights
echo   2. الـ Agents - 43 agent مع زرار شغل
echo   3. إبداع - ads + reels + posts
echo   4. ذكاء البيانات - demand + fraud + pricing + qc
echo   5. نمو - partnerships + customers + photos
echo   6. دعم - insights + complaints + emails
echo   7. تحسين ذاتي - prompt versions + recent runs
echo   8. تعاون Agents - launch orchestrator + collabs + messages
echo   9. أعمال - KPIs + briefs + strategy plays
echo.
git add .
git status --short
echo.
git commit -m "feat: master admin HQ panel with 9 tabs consolidating all features"
git push origin main
echo.
echo ================================================================
echo   DONE - Visit: madmonacairo.com/admin/hq
echo ================================================================
echo.
pause
