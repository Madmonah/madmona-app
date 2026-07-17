# Copy ONLY the images I looked at and approved. Everything else stays out.
# ❌ excluded on sight: Keynote screenshots (Common Haus factsheet was screen-captured
#    with the macOS dock visible), floor plans, location maps, logo cards, blank textures,
#    a CCTV close-up, and MONARK's price table (had "Incentive (sales)" — broker-only).
import os, shutil, glob
R = r"E:\madmona-app\scripts\out\renders"
D = r"E:\madmona-app\scripts\out\picked"
os.makedirs(D, exist_ok=True)

PICKS = {
 # RITZ New Zayed — cover first
 "ritz":    ["p23-45","p21-41","p16-31","p7-14","p13-25","p12-23","p19-37","p10-19",
             "p22-43","p25-50","p4-8","p24-47","p15-29","p2-4"],
 # I Business Park — tower renders only (dropped the "About ARQA" and Downtown-map text pages)
 "ibp":     ["p5-28","p16-94","p19-112","p18-106","p0-145","p7-40"],
 # Common Haus — clean renders only (NO Keynote screenshots)
 "haus":    ["p5-58","p4-53","p6-63","p7-68","p13-110","p14-115","p16-126","p17-131","p15-120","p12-105"],
 # ANNEX 26 Mall (dropped the consultants' logo page)
 "annex":   ["p3-31","p6-51","p8-64","p9-74","p5-44","p2-11"],
 # Compound Anakaji
 "anakaji": ["p18-89","p14-69","p19-94","p21-104","p11-54","p26-129","p28-139","p27-134","p9-44"],
}

n = 0
for pre, ids in PICKS.items():
    for i, key in enumerate(ids):
        m = glob.glob(f"{R}/{pre}-{key}.*")
        if not m:
            print("!! missing", pre, key); continue
        ext = os.path.splitext(m[0])[1]
        dst = f"{D}/{pre}-{i:02d}{ext}"
        shutil.copy(m[0], dst); n += 1
print("picked", n, "->", D)
