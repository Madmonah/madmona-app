@echo off
cd /d E:\madmona-app\scripts
python -m pip install pymupdf pillow -q 2>nul
python squeeze.py "E:\madmona-app\.wa-dl\RITZ New Zayed Brochure.pdf" "E:\madmona-app\ritz-small.pdf" 1600 72
