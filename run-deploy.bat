@echo off
REM Launches Git Bash with the deploy script

cd /d "%~dp0"

REM Try to find Git Bash in common locations
set "GITBASH="
if exist "C:\Program Files\Git\bin\bash.exe" set "GITBASH=C:\Program Files\Git\bin\bash.exe"
if exist "C:\Program Files (x86)\Git\bin\bash.exe" set "GITBASH=C:\Program Files (x86)\Git\bin\bash.exe"
if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "GITBASH=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"

if "%GITBASH%"=="" (
  echo ERROR: Git Bash not found.
  echo.
  echo Please install Git for Windows from:
  echo   https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

echo Found Git Bash at: %GITBASH%
echo Launching deploy.sh...
echo.

"%GITBASH%" --login -i "%~dp0deploy.sh"

pause
