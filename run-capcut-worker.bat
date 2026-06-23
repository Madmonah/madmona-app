@echo off
REM Runs the Madmona CapCut reel worker (step 1)
cd /d C:\madmona-capcutapi
call venv\Scripts\activate.bat
pip install requests >nul 2>&1
python capcut_reel_worker.py
pause
