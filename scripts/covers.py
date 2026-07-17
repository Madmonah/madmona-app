# Render EVERY project cover with its title so I can spot wrong/mismatched ones.
# Grouped by property_type: a residential card showing an office tower is the tell.
import io, json, urllib.request
from PIL import Image, ImageDraw

rows = json.load(open(r"E:\madmona-app\scripts\covers.json", encoding="utf-8"))
cols, tw = 7, 300
th = []
for r in rows:
    try:
        with urllib.request.urlopen(r["cover_url"], timeout=90) as h:
            im = Image.open(io.BytesIO(h.read())).convert("RGB")
    except Exception as e:
        print("FAIL", r["title"], e); continue
    im.thumbnail((tw, tw))
    th.append((f'{r["i"]:02d} [{r["property_type"][:4]}]', im))

H = max(i.height for _, i in th) + 16
rows_n = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols * (tw + 6), rows_n * (H + 6)), "white")
d = ImageDraw.Draw(s)
for k, (nm, im) in enumerate(th):
    x, y = (k % cols) * (tw + 6), (k // cols) * (H + 6)
    s.paste(im, (x, y + 14)); d.text((x + 3, y + 2), nm, fill="red")
s.save(r"E:\madmona-app\scripts\out\COVERS.png")
print(len(th), "->", s.size)
