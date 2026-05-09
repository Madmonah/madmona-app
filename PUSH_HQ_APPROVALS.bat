@echo off
setlocal
cd /d "C:\madmona-app"
echo ================================================================
echo   PUSHING: HQ SUPPLIER APPROVAL — موافقة الموردين من HQ
echo ================================================================
echo.
echo NEW FEATURE:
echo   Supplier approval inline في tab "السوق"
echo   موافقة / رفض / إيقاف بدون انتقال لصفحة تانية
echo.
echo NEW API:
echo   POST /api/admin/supplier-action
echo   - يستخدم session auth بدل الـ password المنفصل
echo   - يستفيد من الـ admin role في profile
echo.
echo UPDATED:
echo   /admin/hq tab السوق يبدأ تلقائياً بـ "مؤجرين"
echo   لو فيه pending suppliers
echo.
git add .
git status --short
echo.
git commit -m "feat: inline supplier approval in HQ panel - no separate password needed"
git push origin main
echo.
echo ================================================================
echo   DONE - Visit: madmonacairo.com/admin/hq
echo ================================================================
echo.
pause
