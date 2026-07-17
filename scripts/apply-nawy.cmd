@echo off
cd /d E:\madmona-app
supabase db push --help >nul 2>&1
REM نفّذ SQL مباشرة على قاعدة الإنتاج عبر psql المدمج في الـCLI
type scripts\nawy.sql | supabase db query --linked 2>&1
echo EXIT=%ERRORLEVEL%
