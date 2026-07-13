@echo off
cd /d E:\madmona-app\scripts
python -m pip install openpyxl > pip.log 2>&1
python build-sheet.py
