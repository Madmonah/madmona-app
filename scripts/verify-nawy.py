# Verify a sample of new Nawy covers actually load, and eyeball them.
import io, urllib.request
from PIL import Image, ImageDraw
B = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/nawy/nawy-media/"
# عينة: لوجو-اتصلّح + رِندرات + ساحل
SAMPLE = [("Celia (كان لوجو)","893594b7-1.jpg"),("Sadaf (كان صدف)","a68086c8-1.jpg"),
  ("Sky Bridge (كان لافتة)","e375419e-1.jpg"),("Seashore (كان قماش)","4fa3528a-1.jpg"),
  ("Common Haus (كان لوجو)","87c8c3d7-1.jpg"),("Fifth Square","066f00fe-0.jpg"),
  ("Il Bosco","4993dfd5-0.jpg"),("Marassi","1dee18ca-0.jpg"),("ZED East","3f31ed49-0.jpg"),
  ("Talda","397319a3-0.jpg"),("Mall The Gray","00b3ab78-0.jpg"),("Hyde Park NC","97874ad5-0.jpg")]
cols, tw = 4, 360; th=[]
for label, fn in SAMPLE:
    try:
        with urllib.request.urlopen(B+fn, timeout=60) as r:
            im = Image.open(io.BytesIO(r.read())).convert("RGB"); im.thumbnail((tw,tw)); th.append((label,im))
    except Exception as e: print("FAIL",label,e)
H = max(i.height for _,i in th)+18
rows=(len(th)+cols-1)//cols
s=Image.new("RGB",(cols*(tw+6),rows*(H+6)),"white"); d=ImageDraw.Draw(s)
for k,(nm,im) in enumerate(th):
    x,y=(k%cols)*(tw+6),(k//cols)*(H+6); s.paste(im,(x,y+16)); d.text((x+3,y+3),nm,fill="red")
s.save(r"E:\madmona-app\scripts\out\NAWY-VERIFY.png"); print(len(th),"->",s.size)
