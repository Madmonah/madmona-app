# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
try:
    from pypdf import PdfReader
except ImportError:
    from PyPDF2 import PdfReader
r = PdfReader(r'E:\madmona-app\scripts\monark.pdf')
print('PAGES', len(r.pages))
for i, p in enumerate(r.pages):
    t = (p.extract_text() or '').strip()
    if t:
        print(f'--- p{i+1} ---')
        print(t[:900])
