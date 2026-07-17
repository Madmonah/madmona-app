@echo off
cd /d E:\madmona-app
supabase storage cp scripts\out\ivy-residence-brochure.pdf ss:///content-images/projects/ivy-residence-brochure.pdf --linked --experimental
echo EXIT=%ERRORLEVEL%
