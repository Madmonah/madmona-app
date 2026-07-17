# Contact sheet of extracted images so I choose covers with my eyes, not by filename.
import os, sys, glob
from PIL import Image, ImageDraw

R = r"E:\madmona-app\scripts\out\renders"
prefix = sys.argv[1]
files = sorted(glob.glob(f"{R}/{prefix}-*"),
               key=lambda p: int(os.path.basename(p).split("-p")[1].split("-")[0]))
cols, tw = 6, 320
thumbs = []
for f in files:
    im = Image.open(f).convert("RGB"); im.thumbnail((tw, tw))
    thumbs.append((os.path.basename(f), im))
th = max(i.height for _, i in thumbs) + 18
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (tw + 8), rows * (th + 8)), "white")
dr = ImageDraw.Draw(sheet)
for k, (nm, im) in enumerate(thumbs):
    x, y = (k % cols) * (tw + 8), (k // cols) * (th + 8)
    sheet.paste(im, (x, y + 16))
    dr.text((x + 3, y + 2), nm.split("-", 1)[1].rsplit(".", 1)[0], fill="red")
sheet.save(f"{R}/../sheet-{prefix}.png")
print(prefix, len(thumbs), "imgs ->", sheet.size)
