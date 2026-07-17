@echo off
cd /d E:\madmona-app
supabase storage cp ritz-small.pdf "ss:///content-images/wa-recovered/ritz-new-zayed-brochure.pdf" --linked --experimental --content-type application/pdf
echo EXIT=%ERRORLEVEL%
