@echo off
cd /d E:\madmona-app
for %%f in (scripts\out\picked\*.jpg) do (
  supabase storage cp scripts\out\picked\%%~nxf ss:///content-images/projects/%%~nxf --linked --experimental >nul 2>&1
  echo %%~nxf %ERRORLEVEL%
)
echo ALL-DONE
