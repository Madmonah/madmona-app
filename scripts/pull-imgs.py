# Pull EMBEDDED images out of a brochure at native resolution.
# Better than rendering pages: no white margins, no text overlay, no logo bars.
# Filters: skip small/低-res assets (logos, icons) and near-square UI bits.
import os, sys, urllib.request, fitz, hashlib

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/"
OUT = r"E:\madmona-app\scripts\out\renders"
os.makedirs(OUT, exist_ok=True)

url, prefix = sys.argv[1], sys.argv[2]
minw = int(sys.argv[3]) if len(sys.argv) > 3 else 1000

with urllib.request.urlopen(S + url, timeout=300) as r:
    d = fitz.open(stream=r.read(), filetype="pdf")

seen, n = set(), 0
for pno in range(d.page_count):
    for info in d[pno].get_images(full=True):
        xref = info[0]
        try:
            img = d.extract_image(xref)
        except Exception:
            continue
        b = img["image"]
        h = hashlib.md5(b).hexdigest()
        if h in seen:            # same render reused on several pages
            continue
        seen.add(h)
        w, ht = img["width"], img["height"]
        if w < minw or ht < 500:  # logos / icons / textures
            continue
        ext = img["ext"]
        p = f"{OUT}/{prefix}-p{pno}-{xref}.{ext}"
        open(p, "wb").write(b)
        n += 1
        print(f"{p}  {w}x{ht}  {round(len(b)/1024)}KB")
print("total", n)
