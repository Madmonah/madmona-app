# Contact sheet of a brochure so I can eyeball which page is the best hero render.
import io, os, sys, urllib.request, fitz
from PIL import Image, ImageDraw

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/"
OUT = r"E:\madmona-app\scripts\out"
os.makedirs(OUT, exist_ok=True)

url, name, first, last = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
with urllib.request.urlopen(S + url, timeout=300) as r:
    d = fitz.open(stream=r.read(), filetype="pdf")

last = min(last, d.page_count - 1)
cols, tw = 6, 300
thumbs = []
for pno in range(first, last + 1):
    pix = d[pno].get_pixmap(dpi=40)
    im = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    im.thumbnail((tw, tw))
    thumbs.append((pno, im))

th = max(i.height for _, i in thumbs) + 18
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (tw + 8), rows * (th + 8)), "white")
dr = ImageDraw.Draw(sheet)
for k, (pno, im) in enumerate(thumbs):
    x, y = (k % cols) * (tw + 8), (k // cols) * (th + 8)
    sheet.paste(im, (x, y + 16))
    dr.text((x + 4, y + 2), f"p{pno}", fill="red")
sheet.save(f"{OUT}/{name}.png")
print(name, "pages", first, "-", last, "of", d.page_count, "->", sheet.size)
