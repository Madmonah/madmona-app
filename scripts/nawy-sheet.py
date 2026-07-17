# Contact sheet — cover image (index 0) of each project, to eyeball quality/mismatch.
import os, glob, json
from PIL import Image, ImageDraw
D = r"E:\madmona-app\scripts\nawy-media"
man = json.load(open(r"E:\madmona-app\scripts\nawy-manifest.json", encoding="utf-8"))
name = {m["our"][:8]: m["name"] for m in man}
# cover = file ending -0.jpg
covers = sorted(glob.glob(f"{D}/*-0.jpg"))
cols, tw = 6, 320
th = []
for f in covers:
    slug = os.path.basename(f).split("-")[0]
    try:
        im = Image.open(f).convert("RGB"); im.thumbnail((tw, tw))
        th.append((name.get(slug, slug), im))
    except: pass
H = max(i.height for _, i in th) + 18
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols*(tw+6), rows*(H+6)), "white")
d = ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y = (k%cols)*(tw+6), (k//cols)*(H+6)
    s.paste(im,(x,y+16)); d.text((x+3,y+3),nm[:34],fill="red")
s.save(r"E:\madmona-app\scripts\out\NAWY-COVERS.png")
print(len(th),"covers ->",s.size)
