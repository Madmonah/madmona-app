@echo off
cd /d "C:\madmona-app"
echo.
echo ================================================================
echo                    DEPLOYING NOW
echo ================================================================
echo.
git add .
git commit -m "fix: marketplace suppliers + dashboard performance"
git push origin main
echo.
echo ================================================================
echo  DONE! استنى دقيقة وافتح:
echo  https://www.madmonacairo.com/admin/marketplace-suppliers
echo ================================================================
echo.
pause
