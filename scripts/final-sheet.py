# Final eyeball on exactly what will go live. Order matters: *-00 becomes the cover.
import os, glob
from PIL import Image, ImageDraw
D = r"E:\madmona-app\scripts\out\picked"
files = sorted(glob.glob(f"{D}/*.jpg"))
cols, tw = 8, 300
th = []
for f in files:
    im = Image.open(f); im.thumbnail((tw, tw)); th.append((os.path.basename(f)[:-4], im))
H = max(i.height for _, i in th) + 18
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols * (tw + 6), rows * (H + 6)), "white")
d = ImageDraw.Draw(s)
for k, (nm, im) in enumerate(th):
    x, y = (k % cols) * (tw + 6), (k // cols) * (H + 6)
    s.paste(im, (x, y + 16))
    d.text((x + 3, y + 2), nm, fill="red")
s.save(r"E:\madmona-app\scripts\out\FINAL.png")
print(len(th), "->", s.size)
