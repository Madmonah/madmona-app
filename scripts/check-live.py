# ⚠️ "registered in the DB" != "opens for a customer". Hit every public media URL for real.
import urllib.request

S = "https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/content-images/projects/"
names = ["ivy-residence-brochure.pdf"]
for pre, n in [("ritz", 14), ("ibp", 6), ("haus", 10), ("annex", 6), ("anakaji", 9)]:
    names += [f"{pre}-{i:02d}.jpg" for i in range(n)]
names += [f"monark-p{p}.jpg" for p in (68, 80, 56, 64, 76, 84)]

bad = 0
for nm in names:
    u = S + nm
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, method="HEAD"), timeout=60)
        if r.status != 200:
            bad += 1; print("BAD", r.status, nm)
    except Exception as e:
        bad += 1; print("FAIL", nm, e)
print(f"\nchecked {len(names)} | broken: {bad}")
