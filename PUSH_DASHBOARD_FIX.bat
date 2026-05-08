@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   FIX: Dashboard performance (9 queries -^> 1 query)
echo ================================================================
echo.
echo PROBLEM: Dashboard كان بيعمل 9 طلبات منفصلة فبيعلق
echo SOLUTION: دلوقتي بيستخدم function واحدة في الـ database
echo RESULT: 1.3ms بدل من ثواني كتيرة
echo.
git add .
git status --short
echo.
git commit -m "perf: dashboard uses single RPC instead of 9 separate queries"
git push origin main
echo.
echo ================================================================
echo   DONE - استنى دقيقة وافتح الـ dashboard من تاني
echo ================================================================
echo.
pause
