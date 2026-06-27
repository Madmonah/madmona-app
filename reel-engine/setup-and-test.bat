@echo off
REM إعداد وتجربة محرّك رندر مضمونة (Windows)
cd /d "%~dp0"
echo [1/3] تثبيت Pillow...
python -m pip install -r requirements.txt
echo [2/3] تنزيل خط Cairo...
python madmona_render.py --setup
echo [3/3] تجربة: رندر ريل من sample_reel.json
python madmona_render.py reel sample_reel.json test_reel.mp4
echo.
echo خلص. شوف test_reel.mp4
pause
