# Render the same page from both PDFs side by side so I can judge quality by eye
import sys, fitz
from PIL import Image
import io

a, b, out = sys.argv[1], sys.argv[2], sys.argv[3]
pages = [int(x) for x in (sys.argv[4] if len(sys.argv) > 4 else "0,5,20").split(",")]

tiles = []
for pno in pages:
    row = []
    for f in (a, b):
        d = fitz.open(f)
        pm = d[pno].get_pixmap(dpi=90)
        row.append(Image.open(io.BytesIO(pm.tobytes("png"))))
        d.close()
    tiles.append(row)

W = max(t[0].width + t[1].width + 12 for t in tiles)
H = sum(max(t[0].height, t[1].height) + 26 for t in tiles)
canvas = Image.new("RGB", (W, H), (20, 20, 20))
y = 0
for pno, (l, r) in zip(pages, tiles):
    canvas.paste(l, (0, y + 22))
    canvas.paste(r, (l.width + 12, y + 22))
    y += max(l.height, r.height) + 26
canvas.save(out, quality=88)
print("saved", out, "| left = original 64MB, right = compressed 6.9MB | pages", pages)
