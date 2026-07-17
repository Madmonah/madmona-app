# Pull chosen full-bleed render pages out of a brochure as JPGs ready to upload.
# 💡 The developer's own brochure IS professional marketing media — no AI, no stock needed.
import io, os, sys, urllib.request, fitz
from PIL import Image

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/"
OUT = r"E:\madmona-app\scripts\out\renders"
os.makedirs(OUT, exist_ok=True)

url, prefix = sys.argv[1], sys.argv[2]
pages = [int(x) for x in sys.argv[3].split(",")]

with urllib.request.urlopen(S + url, timeout=300) as r:
    d = fitz.open(stream=r.read(), filetype="pdf")

for pno in pages:
    pix = d[pno].get_pixmap(dpi=170)
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    im.thumbnail((1900, 1900))
    p = f"{OUT}/{prefix}-p{pno}.jpg"
    im.save(p, "JPEG", quality=86, optimize=True)
    print(p, im.size, round(os.path.getsize(p) / 1024), "KB")
