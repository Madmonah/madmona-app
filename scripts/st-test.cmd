@echo off
cd /d E:\madmona-app
echo probe > probe.txt
echo --- مسار نسبي من جذر المشروع ---
supabase storage cp probe.txt "ss:///content-images/wa-recovered/_probe.txt" --linked --experimental
echo EXIT=%ERRORLEVEL%
echo --- فحص: هل اترفع؟ ---
supabase storage ls "ss:///content-images/wa-recovered/" --linked --experimental
