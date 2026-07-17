@echo off
REM ⚠️ لازم يتنفّذ من E:\madmona-app — الـ supabase link مربوط بالمجلد، والمسار لازم يكون نسبي
cd /d E:\madmona-app
for %%f in (scripts\out\renders\monark-*.jpg) do (
  echo == %%~nxf
  supabase storage cp "scripts\out\renders\%%~nxf" "ss:///content-images/projects/%%~nxf" --linked --experimental
)
echo DONE
