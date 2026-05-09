@echo off
cd /d C:\madmona-app

echo ============================================
echo  FIND LARGE FILES IN GIT HISTORY
echo ============================================
echo.

echo [1] Top 20 largest objects in git pack:
echo.
git rev-list --objects --all > "%TEMP%\git-objects.txt" 2>nul
git verify-pack -v .git\objects\pack\pack-*.idx 2>nul | findstr "blob" | sort /R /+18 > "%TEMP%\packlist.txt"

REM Read top 20 lines from packlist and resolve names
set count=0
for /f "tokens=1,3" %%a in (%TEMP%\packlist.txt) do (
    if !count! lss 20 (
        for /f "tokens=2*" %%x in ('findstr /b "%%a" "%TEMP%\git-objects.txt" 2^>nul') do (
            echo %%b bytes - %%x %%y
        )
        set /a count+=1
    )
)
setlocal enabledelayedexpansion

echo.
echo [2] Files larger than 50MB in working tree (excluding .git):
forfiles /S /M *.* /C "cmd /c if @fsize gtr 52428800 echo @fsize bytes - @path" 2>nul | findstr /v ".git\\objects\\" | findstr /v "node_modules"
echo.

echo [3] Total .git size:
for /f %%I in ('dir .git /s ^| findstr "File(s)"') do echo %%I
echo.

echo [4] Latest 5 commits + sizes of changed files:
git log --oneline -5
echo.

pause
