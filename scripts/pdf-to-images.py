# -*- coding: utf-8 -*-
# تحويل PDF لصور عشان نقدر نقراه بصريًا.
#
# ليه: منيوهات المطاعم كتير بتيجي PDF مسكنّر (صور جوّه ملف) —
# مفيش نص يتقري منه. وممنوع نطلب من المطعم يبعت المنيو تاني،
# فبنحوّله صور ونقراه بنفسنا.
#
#   python scripts/pdf-to-images.py heros-3.pdf out/

import sys, os
import fitz

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else 'pdf-pages'
os.makedirs(out, exist_ok=True)

doc = fitz.open(src)
base = os.path.splitext(os.path.basename(src))[0]

for i, page in enumerate(doc):
    # 150 dpi كفاية لقراءة أسعار المنيو من غير ما الملف يكبر
    pix = page.get_pixmap(dpi=150)
    path = os.path.join(out, f'{base}-p{i+1}.png')
    pix.save(path)
    print(f'{path}  {pix.width}x{pix.height}')

print(f'TOTAL {len(doc)}')
