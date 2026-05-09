@echo off
cd /d "%~dp0"
set "GITBASH="
if exist "C:\Program Files\Git\bin\bash.exe" set "GITBASH=C:\Program Files\Git\bin\bash.exe"
if exist "C:\Program Files (x86)\Git\bin\bash.exe" set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "GITBASH=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
if "%GITBASH%"=="" (
  echo ERROR: Git Bash not found.
  pause
  exit /b 1
)
"%GITBASH%" --login -i "%~dp0deploy-news.sh"
pause
