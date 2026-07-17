# ⚠️ Verify the LIVE uploaded file — not the local one. `uploaded` != `serving`.
import urllib.request, re, fitz
U = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/projects/ivy-residence-brochure.pdf"
BAD = re.compile(r"(commission|incentive|عمول|حواف|team\s*leader)", re.I)
req = urllib.request.urlopen(U, timeout=300)
print("HTTP", req.status, req.headers.get("content-type"))
d = fitz.open(stream=req.read(), filetype="pdf")
hits = [p for p in range(d.page_count) if BAD.search(d[p].get_text())]
print("live pages:", d.page_count, "| commission pages:", hits)
print("VERDICT:", "CLEAN" if not hits else "STILL LEAKING")
