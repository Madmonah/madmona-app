# Final review sheet + web-size the chosen category heroes.
import glob, os
from PIL import Image, ImageDraw
D = r"E:\madmona-app\scripts\cat-final"
files = sorted(glob.glob(f"{D}/*.jpg"))
th = []
for f in files:
    im = Image.open(f).convert("RGB")
    w, h = im.size
    # صغّر للويب: 1400px عرض أقصى
    im.thumbnail((1400, 1400))
    im.save(f, "JPEG", quality=85, optimize=True)
    t = im.copy(); t.thumbnail((330, 260))
    th.append((f"{os.path.basename(f)[:-4]} ({w}x{h})", t))
cols = 5
H = max(i.height for _, i in th) + 16
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols*336, rows*(H+6)), "white")
d = ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y = (k%cols)*336, (k//cols)*(H+6)
    s.paste(im,(x,y+14)); d.text((x+2,y+2),nm,fill="red")
s.save(r"E:\madmona-app\scripts\out\CAT-FINAL.png")
print(len(th),"->",s.size)
