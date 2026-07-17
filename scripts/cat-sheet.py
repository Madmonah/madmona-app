# Look at every real category image with my own eyes. Some are technically
# "real" but sell nothing — e.g. shop-misc = empty shelves + a fire extinguisher.
import io, os, urllib.request
from PIL import Image, ImageDraw

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/ads/categories/real/"
NAMES = """auto-services beauty childcare consultations contractors education-courses equipment
events-photography fashion-rental food-asian food-burgers food-cafe food-catering food-desserts
food-egyptian food-general food-grill food-healthy food-pizza food-seafood halls home-services
marine media medical-clinics pet-services printing professionals properties-commercial
properties-industrial properties-residential properties-tourism recreation religious-services
shop-appliances shop-auto shop-baby shop-beauty shop-books shop-electronics shop-fashion
shop-home shop-misc shop-sports tech-equipment tourism vehicles weddings workspaces""".split()

cols, tw = 8, 250
th = []
for n in NAMES:
    try:
        with urllib.request.urlopen(S + n + ".jpg", timeout=90) as r:
            im = Image.open(io.BytesIO(r.read())).convert("RGB")
    except Exception as e:
        print("FAIL", n, e); continue
    im.thumbnail((tw, tw)); th.append((n, im))

H = max(i.height for _, i in th) + 18
rows = (len(th) + cols - 1) // cols
s = Image.new("RGB", (cols * (tw + 6), rows * (H + 6)), "white")
d = ImageDraw.Draw(s)
for k, (nm, im) in enumerate(th):
    x, y = (k % cols) * (tw + 6), (k // cols) * (H + 6)
    s.paste(im, (x, y + 16)); d.text((x + 3, y + 2), nm, fill="red")
s.save(r"E:\madmona-app\scripts\out\CATS.png")
print(len(th), "->", s.size)
