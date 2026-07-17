"""
Render candidate cover images so I can LOOK before assigning.
Lesson (Techwood / G-Bay): never assign media by guessing — read what's on the image.
NOTE: inbound images live in bucket `content-images`, documents in `project-media`.
"""
import io, os, urllib.request, fitz
from PIL import Image

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/"
OUT = r"E:\madmona-app\scripts\out"
os.makedirs(OUT, exist_ok=True)

def get(u):
    with urllib.request.urlopen(u, timeout=180) as r:
        return r.read()

for i, f in enumerate([
    "content-images/wa-inbound/1783942238245-I3RDY5RAA.jpg",
    "content-images/wa-inbound/1783942238168-U0MjMxOQA.jpg",
    "content-images/wa-inbound/1783871354208-E2NTg1QTYA.jpg",   # Five Palm — caption said "أنظمة السداد"
]):
    im = Image.open(io.BytesIO(get(S + f))).convert("RGB")
    im.thumbnail((1000, 1000))
    im.save(f"{OUT}/cand-{i}.png")
    print("img", i, im.size, f)

pdf = get(S + "project-media/wa-inbound/1783942240788-NUU3NQA-Monark-Residences---Brochure-.pdf")
d = fitz.open(stream=pdf, filetype="pdf")
print("monark brochure pages:", d.page_count)
for pno in range(min(2, d.page_count)):
    d[pno].get_pixmap(dpi=100).save(f"{OUT}/monark-p{pno}.png")
    print("monark page", pno, "ok")
