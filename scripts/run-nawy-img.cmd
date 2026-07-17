@echo off
cd /d E:\madmona-app
type scripts\nawy-img.sql | supabase db query --linked 2>&1
echo EXIT=%ERRORLEVEL%
