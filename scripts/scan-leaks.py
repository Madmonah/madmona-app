# 🔒 Scan every publicly-linked brochure for internal broker content.
# Root cause of the URD leak: developer marketing is written for BROKERS, not customers.
import urllib.request, re, fitz

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/"
BAD = re.compile(r"(commission|incentive|عمول|حواف|broker\s*(kit|share)|team\s*leader|sales\s*commission)", re.I)

DOCS = {
 "IVY Residence":   "project-media/wa-inbound/1783948765835-NkQyOEQA-BROKER-KIT-1.pdf",
 "MONARK":          "project-media/wa-inbound/1783942240788-NUU3NQA-Monark-Residences---Brochure-.pdf",
 "ANNEX 26 Mall":   "project-media/wa-inbound/1783952498255-RDdFOTIA-ANNEX-Brochure-V2.15112024.pdf",
 "RITZ New Zayed":  "content-images/wa-recovered/ritz-new-zayed-brochure.pdf",
 "I Business Park": "content-images/wa-recovered/i-business-park-brochure.pdf",
 "Common Haus":     "project-media/wa-inbound/1783873110926-NEMxRjAA-Factsheet-Commonhaus.pdf",
 "Compound Anakaji":"project-media/wa-inbound/1783862707680-QkNBQ0MA-final.pdf.pdf.pdf",
}

for name, path in DOCS.items():
    try:
        with urllib.request.urlopen(S + path, timeout=300) as r:
            d = fitz.open(stream=r.read(), filetype="pdf")
    except Exception as e:
        print(f"[?] {name}: {e}"); continue
    hits = []
    for pno in range(d.page_count):
        for m in set(x.group(0) for x in BAD.finditer(d[pno].get_text())):
            hits.append((pno, m))
    flag = "LEAK" if hits else "clean"
    print(f"[{flag}] {name}  ({d.page_count} pages)")
    for pno, m in hits:
        print(f"        p{pno}: {m!r}")
