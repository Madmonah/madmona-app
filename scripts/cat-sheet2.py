# Contact sheet of category-hero candidates for eyeball review.
import glob, os
from PIL import Image, ImageDraw
D = r"E:\madmona-app\scripts\cat-hero"
files = sorted(glob.glob(f"{D}/*.jpg"))
cols, tw = 10, 190
th = []
for f in files:
    try:
        im = Image.open(f).convert("RGB"); im.thumbnail((tw, 150))
        th.append((os.path.basename(f)[:-4], im))
    except Exception as e:
        print("skip", os.path.basename(f), e)
H = max(i.height for _, i in th) + 15
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols*(tw+5), rows*(H+5)), "white")
d = ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y = (k%cols)*(tw+5), (k//cols)*(H+5)
    s.paste(im,(x,y+13)); d.text((x+2,y+1),nm,fill="red")
s.save(r"E:\madmona-app\scripts\out\CAT-HERO.png")
print(len(th),"->",s.size)
