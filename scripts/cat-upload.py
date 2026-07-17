# اعتماد بديل الخضار + تصغير + تجهيز مجلد الرفع النهائي
import os, glob, shutil
from PIL import Image
D = r"E:\madmona-app\scripts\cat-final"
# بديل الخضار (الأصلية كان فيها ووترمارك)
shutil.copy(f"{D}\\produce-alt-9.jpg", f"{D}\\shop-produce.jpg")
for f in glob.glob(f"{D}\\produce-alt-*.jpg"):
    os.remove(f)
# تصغير أي صورة لسه كبيرة (بديل الخضار)
for f in glob.glob(f"{D}\\*.jpg"):
    im = Image.open(f).convert("RGB")
    im.thumbnail((1400, 1400))
    im.save(f, "JPEG", quality=85, optimize=True)
    print(os.path.basename(f), im.size, round(os.path.getsize(f)/1024), "KB")
