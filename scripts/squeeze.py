# Downsample images inside a PDF so it is usable on mobile data.
# ⚠️ LESSON (15 Jul 2026): update_stream() on a JPEG xref produced BLACK pages —
#    the stream filters no longer matched the new bytes. Use replace_image(), and
#    skip any image that is CMYK / has an alpha mask / isn't a plain RGB JPEG.
import sys, os, io, fitz
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
MAXW = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
Q = int(sys.argv[4]) if len(sys.argv) > 4 else 72

d = fitz.open(src)
print("pages:", d.page_count)
done = skipped = 0
seen = set()

for pno in range(d.page_count):
    for img in d[pno].get_images(full=True):
        xref, smask = img[0], img[1]
        if xref in seen:
            continue
        seen.add(xref)
        try:
            info = d.extract_image(xref)
        except Exception:
            skipped += 1; continue
        raw = info["image"]
        if len(raw) < 60_000:               # tiny -> not worth it
            skipped += 1; continue
        try:
            im = Image.open(io.BytesIO(raw))
            if im.mode != "RGB":
                im = im.convert("RGB")
            if im.width > MAXW:
                im = im.resize((MAXW, int(im.height * MAXW / im.width)), Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=Q, optimize=True, progressive=True)
            if buf.tell() >= len(raw):
                skipped += 1; continue
            d[pno].replace_image(xref, stream=buf.getvalue())   # على الصفحة مش المستند
            done += 1
        except Exception as e:
            if skipped < 3: print("  skip reason:", type(e).__name__, str(e)[:90])
            skipped += 1; continue

d.save(dst, garbage=4, deflate=True, clean=True)
d.close()
a, b = os.path.getsize(src) / 1048576, os.path.getsize(dst) / 1048576
print("recompressed:", done, "| skipped:", skipped)
print("before: %.1f MB -> after: %.1f MB  (%.0f%% smaller)" % (a, b, 100 - b / a * 100))
