@echo off
chcp 65001 >nul
cd /d E:\madmona-app
echo ============ MADMONA PUSH ============
git add .
set MSG=%~1
if "%MSG%"=="" set MSG=update %date% %time%
git diff --cached --quiet
if %errorlevel%==0 (
  echo [i] no new changes - nothing to commit
) else (
  git commit -m "%MSG%"
  git push
  echo [OK] pushed
)
echo ======================================
pause
