from PIL import Image, ImageDraw
import glob, os
D = r"E:\madmona-app\scripts\thumbs"
files = sorted(glob.glob(f"{D}\\*.jpg"))
cols, tw = 6, 300
th = []
for f in files:
    im = Image.open(f).convert("RGB"); im.thumbnail((tw, 220))
    th.append((os.path.basename(f)[:-4], im))
H = max(i.height for _, i in th) + 15
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols*(tw+5), rows*(H+5)), "white")
d = ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y = (k%cols)*(tw+5), (k//cols)*(H+5)
    s.paste(im,(x,y+13)); d.text((x+2,y+1),nm,fill="red")
s.save(r"E:\madmona-app\scripts\out\THUMBS.png")
print(len(th),"->",s.size)
