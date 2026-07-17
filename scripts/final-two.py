import glob
from PIL import Image
for f in glob.glob(r"E:\madmona-app\scripts\final-two\*.jpg"):
    im = Image.open(f).convert("RGB")
    im.thumbnail((1400, 1400))
    im.save(f, "JPEG", quality=85, optimize=True)
    print(f, im.size)
