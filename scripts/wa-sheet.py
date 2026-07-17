# Contact sheet of remaining WhatsApp images — spot chat screenshots.
import glob, os
from PIL import Image, ImageDraw
D = r"E:\madmona-app\scripts\wa-audit"
files = sorted(glob.glob(f"{D}/*.jpg"))
cols, tw = 8, 230
th = []
for f in files:
    try:
        im = Image.open(f).convert("RGB"); im.thumbnail((tw, 300))
        th.append((os.path.basename(f)[:18], im))
    except Exception as e: print("skip", f, e)
H = max(i.height for _, i in th) + 16
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols*(tw+6), rows*(H+6)), "white")
d = ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y = (k%cols)*(tw+6), (k//cols)*(H+6)
    s.paste(im,(x,y+14)); d.text((x+2,y+2),nm,fill="red")
s.save(r"E:\madmona-app\scripts\out\WA-AUDIT.png")
print(len(th),"->",s.size)
