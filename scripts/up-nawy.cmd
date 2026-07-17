@echo off
cd /d E:\madmona-app
for %%f in (scripts\nawy-media\*.jpg) do (
  supabase storage cp scripts\nawy-media\%%~nxf ss:///content-images/nawy/%%~nxf --linked --experimental >nul 2>&1
)
echo ALL-UPLOADED
