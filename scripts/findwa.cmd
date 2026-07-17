@echo off
chcp 65001 > nul
set P=%LOCALAPPDATA%\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm
echo == session.db size ==
for %%F in ("%P%\session.db") do @echo %%~zF bytes
echo == LocalState / LocalCache ==
dir /s /b "%P%\LocalState" 2>nul > "%~dp0ls.txt"
for /f %%A in ('type "%~dp0ls.txt" ^| find /c /v ""') do echo LocalState entries: %%A
dir /s /b "%P%\LocalCache" 2>nul > "%~dp0lc.txt"
for /f %%A in ('type "%~dp0lc.txt" ^| find /c /v ""') do echo LocalCache entries: %%A
echo == any big blobs anywhere (over 1MB) ==
powershell -NoProfile -Command "Get-ChildItem -Path '%P%' -Recurse -File -ErrorAction SilentlyContinue | Where-Object {$_.Length -gt 1MB} | Sort-Object Length -Descending | Select-Object -First 12 | ForEach-Object { '{0,10:N0}  {1}' -f $_.Length, $_.FullName.Substring($_.FullName.Length - [Math]::Min(70,$_.FullName.Length)) }"
echo == done ==
