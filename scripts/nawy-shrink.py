# Web-size all Nawy images in place (they're big S3 originals).
import os, glob
from PIL import Image
D = r"E:\madmona-app\scripts\nawy-media"
a=b=0
for f in glob.glob(f"{D}/*.jpg"):
    try:
        before = os.path.getsize(f)
        im = Image.open(f).convert("RGB"); im.thumbnail((1600,1600))
        im.save(f, "JPEG", quality=84, optimize=True)
        a += before; b += os.path.getsize(f)
    except Exception as e:
        print("skip", os.path.basename(f), e)
print(f"{round(a/1048576)}MB -> {round(b/1048576)}MB across", len(glob.glob(f'{D}/*.jpg')), "files")
