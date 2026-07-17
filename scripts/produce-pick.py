from PIL import Image, ImageDraw
import glob
th = []
for f in sorted(glob.glob(r"E:\madmona-app\scripts\cat-final\produce-alt-*.jpg")):
    im = Image.open(f).convert("RGB")
    label = f"{f.split(chr(92))[-1]} {im.size}"
    im.thumbnail((460, 340))
    th.append((label, im))
H = max(i.height for _, i in th) + 16
s = Image.new("RGB", (len(th)*466, H+6), "white")
d = ImageDraw.Draw(s)
for k, (nm, im) in enumerate(th):
    s.paste(im, (k*466, 16)); d.text((k*466+2, 2), nm, fill="red")
s.save(r"E:\madmona-app\scripts\out\PRODUCE-ALT.png")
print("ok")
