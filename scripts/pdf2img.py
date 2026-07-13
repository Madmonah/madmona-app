# -*- coding: utf-8 -*-
"""يحوّل أول صفحة (أو صفحة محددة) من PDF لصورة JPG — صورة مؤقتة للمشروع"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import fitz  # PyMuPDF

def render(pdf_path, out_path, page=0, zoom=2.0):
    doc = fitz.open(pdf_path)
    if page >= len(doc):
        page = 0
    p = doc[page]
    pix = p.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    pix.save(out_path)
    doc.close()
    return out_path, len(doc) if False else None

if __name__ == '__main__':
    pdf = sys.argv[1]
    out = sys.argv[2]
    pg = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    doc = fitz.open(pdf)
    print('PAGES', len(doc))
    doc.close()
    render(pdf, out, pg)
    print('SAVED', out, os.path.getsize(out), 'bytes')
