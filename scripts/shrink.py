# Web-size the picked images. A 8MB hero doesn't load on an Egyptian mobile plan.
import os, glob
from PIL import Image
D = r"E:\madmona-app\scripts\out\picked"
tot_a = tot_b = 0
for f in sorted(glob.glob(f"{D}/*")):
    before = os.path.getsize(f)
    im = Image.open(f).convert("RGB")
    im.thumbnail((1800, 1800))
    out = os.path.splitext(f)[0] + ".jpg"
    im.save(out, "JPEG", quality=85, optimize=True)
    if out != f:
        os.remove(f)
    after = os.path.getsize(out)
    tot_a += before; tot_b += after
    print(f"{os.path.basename(out):18} {im.size[0]}x{im.size[1]}  {round(before/1024):>5}KB -> {round(after/1024):>4}KB")
print(f"\ntotal {round(tot_a/1048576,1)}MB -> {round(tot_b/1048576,1)}MB")
