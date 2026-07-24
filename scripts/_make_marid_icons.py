import os
from PIL import Image, ImageChops
os.chdir(r"E:\madmona-app")

im = Image.open(r"reel-engine\genie.png").convert("RGB")
# قص الفراغ الأبيض حوالين الجني
bg = Image.new("RGB", im.size, (255, 255, 255))
bbox = ImageChops.difference(im, bg).getbbox()
g = im.crop(bbox)
gw, gh = g.size
print("trim bbox", bbox, "genie", g.size)

def compose(size, scale, out):
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    target = int(size * scale)
    r = min(target / gw, target / gh)
    nw, nh = max(1, int(gw * r)), max(1, int(gh * r))
    gg = g.resize((nw, nh), Image.LANCZOS)
    canvas.paste(gg, ((size - nw) // 2, (size - nh) // 2))
    canvas.save(out)
    print("wrote", out, size, "scale", scale)

# maskable: الجني في منطقة الأمان (~60%) عشان القص الدائري مايقطعوش
compose(512, 0.60, r"public\marid-icon-maskable-512.png")
# أيقونات عادية: الجني أكبر بمسافة بسيطة
compose(512, 0.80, r"public\marid-icon-512.png")
compose(192, 0.80, r"public\marid-icon-192.png")
compose(180, 0.82, r"public\marid-apple-180.png")
print("DONE")
