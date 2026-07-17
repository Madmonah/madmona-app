# 🔒 IVY's public "brochure" was AGEC's BROKER KIT — p61 is a commission structure
# (4% + 1% incentive) and it was one click away for any customer on the project page.
# Build a customer edition: same document, commission page removed. Verified after.
import urllib.request, re, fitz

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/"
SRC = "project-media/wa-inbound/1783948765835-NkQyOEQA-BROKER-KIT-1.pdf"
OUT = r"E:\madmona-app\scripts\out\ivy-residence-brochure.pdf"
BAD = re.compile(r"(commission|incentive|عمول|حواف|team\s*leader)", re.I)

with urllib.request.urlopen(S + SRC, timeout=300) as r:
    d = fitz.open(stream=r.read(), filetype="pdf")

drop = [p for p in range(d.page_count) if BAD.search(d[p].get_text())]
print("dropping pages:", drop)
d.delete_pages(drop)
d.save(OUT, garbage=4, deflate=True)
d.close()

# verify the saved file really has no commission text left
v = fitz.open(OUT)
left = [p for p in range(v.page_count) if BAD.search(v[p].get_text())]
print("pages now:", v.page_count, "| commission pages remaining:", left)
assert not left, "STILL LEAKING"
print("OK ->", OUT)
