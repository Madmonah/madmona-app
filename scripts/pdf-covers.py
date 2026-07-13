# -*- coding: utf-8 -*-
"""
يستخرج كذا صفحة مرشّحة من كل بروشور عشان نختار منها صورة مؤقتة للمشروع.
بيرشّح الصفحات اللي فيها صور كبيرة (رندرات) ومش نص كتير.
"""
import sys, io, os, json, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import fitz

OUT = r'C:\Users\solutions\AppData\Roaming\Claude\local-agent-mode-sessions\b4c8f83c-bfd2-4d1f-a7fa-bfb88a9ebea8\7327d46d-6790-4c13-8b1a-9aee6e2447a3\local_4f4ba56b-2cfb-4d83-8fe8-624b6fdf9a43\outputs'
TMP = r'E:\madmona-app\scripts\pdfs'
os.makedirs(TMP, exist_ok=True)

def score_page(p):
    """صفحة كويسة = صور كبيرة + نص قليل"""
    txt = (p.get_text() or '').strip()
    imgs = p.get_images(full=True)
    area = p.rect.width * p.rect.height
    img_area = 0
    for im in imgs:
        try:
            for r in p.get_image_rects(im[0]):
                img_area += r.width * r.height
        except Exception:
            pass
    cover = img_area / area if area else 0
    # نعاقب الصفحات المليانة نص (جداول أسعار / شروط)
    penalty = min(len(txt) / 600.0, 3.0)
    return cover * 3 - penalty

def extract(name, url, want=4):
    pdf = os.path.join(TMP, name + '.pdf')
    if not os.path.exists(pdf):
        urllib.request.urlretrieve(url, pdf)
    doc = fitz.open(pdf)
    scored = []
    for i in range(min(len(doc), 30)):
        scored.append((score_page(doc[i]), i))
    scored.sort(reverse=True)
    picks = [0] + [i for _, i in scored[:want] if i != 0]
    picks = picks[:want]
    outs = []
    for i in picks:
        o = os.path.join(OUT, f'{name}-p{i+1}.jpg')
        pix = doc[i].get_pixmap(matrix=fitz.Matrix(1.6, 1.6))
        pix.save(o)
        outs.append(o)
    doc.close()
    return outs

if __name__ == '__main__':
    jobs = json.load(open(sys.argv[1], encoding='utf-8'))
    for j in jobs:
        try:
            outs = extract(j['name'], j['url'])
            print(j['name'], '->', ' | '.join(os.path.basename(o) for o in outs))
        except Exception as e:
            print('FAIL', j['name'], str(e)[:60])
