@echo off
cd /d C:\madmona-app

echo ============================================
echo  Find what's locking .git pack files
echo ============================================
echo.

echo [1] Listing all .idx files in pack folder:
dir .git\objects\pack\*.idx
echo.

echo [2] Checking if buffer-graphql branch reached GitHub:
git ls-remote origin buffer-graphql
echo.
echo If hash above is NOT empty, the push succeeded despite the warning.
echo.

echo [3] Latest commit on local buffer-graphql:
git log buffer-graphql --oneline -1 2>nul
echo.

echo [4] Try to find process holding the pack file:
echo (Run as Admin for best results)
powershell -Command "$file = '.git\objects\pack\pack-c22755e009a2c3fd1fc571daabb020dad20047c7.idx'; if (Test-Path $file) { try { $stream = [System.IO.File]::Open($file, 'Open', 'Read', 'None'); $stream.Close(); 'File is NOT locked - safe to proceed' } catch { 'File IS locked by another process: ' + $_.Exception.Message } } else { 'File does not exist anymore' }"
echo.

echo [5] Check known suspects:
powershell -Command "Get-Process | Where-Object {$_.ProcessName -match 'Code|GitHub|gitkraken|fork|tower|sourcetree|cursor|windsurf|onedrive|dropbox|googledrive'} | Format-Table ProcessName, Id, MainWindowTitle"
echo.

pause
