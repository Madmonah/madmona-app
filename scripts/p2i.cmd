@echo off
cd /d E:\madmona-app\scripts
python -m pip install pymupdf -q > nul 2>&1
powershell -Command "Invoke-WebRequest -Uri 'https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/project-media/wa-inbound/1783873110926-NEMxRjAA-Factsheet-Commonhaus.pdf' -OutFile 'E:\madmona-app\scripts\commonhaus.pdf'"
python pdf2img.py "E:\madmona-app\scripts\commonhaus.pdf" "E:\madmona-app\scripts\commonhaus-p1.jpg" 0
