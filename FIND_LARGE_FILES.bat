@echo off
cd /d C:\madmona-app

echo ============================================
echo  Capture full push error
echo ============================================
echo.

echo Pushing with verbose output - this will show the REAL error...
echo.

git push origin main -v 2>&1 | findstr /v "Writing\|Compressing\|Counting\|Delta\|Enumerating"
echo.

echo ============================================
echo Searching for large files in repo...
echo ============================================
echo.

echo [Files larger than 50MB in working tree]:
forfiles /S /M *.* /C "cmd /c if @fsize gtr 52428800 echo @fsize bytes - @path" 2>nul | findstr /v ".git\\objects"
echo.

echo [Largest 10 files in git history]:
git rev-list --objects --all | git cat-file --batch-check="%%(objecttype) %%(objectname) %%(objectsize) %%(rest)" 2>nul | findstr /b "blob" | sort /R /+27 | findstr /n "^" | findstr /b "[1-9]:" | findstr /b "10:"
echo.

echo [Top 10 largest objects in git pack]:
git verify-pack -v .git\objects\pack\pack-*.idx 2>nul | sort /R /+18 | findstr /b /v "non" | findstr /b /v "chain" | findstr /b /v "%%" > %TEMP%\packlist.txt
type %TEMP%\packlist.txt | findstr /n "^" | findstr /b "[1-9]:"
echo.

pause
