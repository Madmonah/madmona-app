# Show ALL images for the 4 brand-cover projects to find first real render.
import io, urllib.request, glob, os
from PIL import Image, ImageDraw
D = r"E:\madmona-app\scripts\nawy-media"
GROUPS = {"Celia":"893594b7","Sadaf":"a68086c8","Seashore":"4fa3528a","Common Haus":"87c8c3d7",
          "Sky Bridge":"e375419e"}
cols, tw = 8, 220; th=[]
for name, slug in GROUPS.items():
    for f in sorted(glob.glob(f"{D}/{slug}-*.jpg"), key=lambda p:int(p.rsplit('-',1)[1][:-4])):
        idx = os.path.basename(f).rsplit('-',1)[1][:-4]
        im = Image.open(f).convert("RGB"); im.thumbnail((tw,tw))
        th.append((f"{name} #{idx}", im))
H=max(i.height for _,i in th)+18; rows=(len(th)+cols-1)//cols
s=Image.new("RGB",(cols*(tw+6),rows*(H+6)),"white"); d=ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y=(k%cols)*(tw+6),(k//cols)*(H+6); s.paste(im,(x,y+16)); d.text((x+2,y+3),nm,fill="red")
s.save(r"E:\madmona-app\scripts\out\CHECK4.png"); print(len(th))
