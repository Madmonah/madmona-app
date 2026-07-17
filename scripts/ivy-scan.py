# 🚨 فحص بروشور IVY المعروض للعملاء — فيه عمولات/أسعار سماسرة؟
import urllib.request, io, re
url = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/projects/ivy-residence-brochure.pdf"
data = urllib.request.urlopen(url, timeout=60).read()
print("size:", round(len(data)/1024), "KB")
try:
    from pypdf import PdfReader
except ImportError:
    import subprocess, sys
    subprocess.run([sys.executable, "-m", "pip", "install", "pypdf", "-q"])
    from pypdf import PdfReader
r = PdfReader(io.BytesIO(data))
print("pages:", len(r.pages))
LEAK = re.compile(r"عمول|commission|broker|سمسار|incentive|كاش باك|cash ?back", re.I)
hits = []
for i, p in enumerate(r.pages):
    t = p.extract_text() or ""
    for m in LEAK.finditer(t):
        s = max(0, m.start()-60)
        hits.append(f"p{i+1}: ...{t[s:m.end()+60].strip()}...")
print("LEAKS:", len(hits))
for h in hits[:10]: print(h)
