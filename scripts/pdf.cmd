@echo off
cd /d E:\madmona-app\scripts
python -m pip install pypdf -q > nul 2>&1
python pdf-read.py
