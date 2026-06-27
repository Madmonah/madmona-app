# -*- coding: utf-8 -*-
"""Madmona reel worker — turns a reel_scripts row into a branded MP4 via madmona_render.
  python reel_worker.py demo   row.json  out.mp4                    # local adapt+render (no DB)
  python reel_worker.py render <reel_id> out.mp4 [--publish]        # fetch from Supabase, render, (optional) publish
Env (render/publish): SUPABASE_URL, SUPABASE_SERVICE_KEY  (also read from .env in this folder).
Default = DRY-RUN (local MP4). --publish uploads to Storage bucket 'reels' and sets video_url+status='rendered'."""
import os, re, sys, json, urllib.request
import madmona_render as M

WA = "واتساب 0100 222 9982"
SITE = "madmonacairo.com"
_KEEP = re.compile(r"[^؀-ۿݐ-ݿ٠-٩A-Za-z0-9 \.\,\!\?\:\%·—\-\/«»\n]")
def clean(s):
    if not s: return ""
    return _KEEP.sub("", str(s)).replace("  "," ").strip(" .·-—")

def adapt(row):
    scenes_in = row.get("scenes") or []
    if isinstance(scenes_in, str): scenes_in = json.loads(scenes_in)
    hook = clean(row.get("hook") or row.get("title"))
    spec = {"format":"reel","scenes":[]}
    spec["scenes"].append({"template":"text","theme":"green","kicker":"مضمونة · القاهرة",
                           "text": hook or "معاملاتك مضمونة","duration":3.6})
    themes=["light","green","dark"]; ti=0
    for sc in scenes_in:
        txt=clean(sc.get("text_overlay"))
        if not txt or txt==hook: continue
        th=themes[ti%len(themes)]; ti+=1
        dur=float(sc.get("duration_sec") or 3.5)
        spec["scenes"].append({"template":"text","theme":th,"text":txt,"duration":max(2.6,dur)})
    spec["scenes"].append({"template":"cta","theme":"green","kicker":"ابدأ دلوقتي",
                           "title":"احجز دلوقتي","pill":"ضيف ليستنجك مجاناً",
                           "lines":[SITE,WA],"duration":4.4})
    return spec

def _env():
    e={}; p=os.path.join(os.path.dirname(os.path.abspath(__file__)),".env")
    if os.path.exists(p):
        for ln in open(p,encoding="utf-8"):
            ln=ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k,v=ln.split("=",1); e[k.strip()]=v.strip()
    e.setdefault("SUPABASE_URL",os.environ.get("SUPABASE_URL",""))
    e.setdefault("SUPABASE_SERVICE_KEY",os.environ.get("SUPABASE_SERVICE_KEY",""))
    return e

def fetch_row(reel_id, env):
    url="%s/rest/v1/reel_scripts?id=eq.%s&select=id,title,hook,cta,scenes"%(env["SUPABASE_URL"].rstrip("/"),reel_id)
    req=urllib.request.Request(url,headers={"apikey":env["SUPABASE_SERVICE_KEY"],
        "Authorization":"Bearer "+env["SUPABASE_SERVICE_KEY"]})
    return json.load(urllib.request.urlopen(req,timeout=30))[0]

def publish(reel_id, mp4, env):
    base=env["SUPABASE_URL"].rstrip("/"); key=env["SUPABASE_SERVICE_KEY"]
    data=open(mp4,"rb").read()
    req=urllib.request.Request(base+"/storage/v1/object/reels/%s.mp4"%reel_id,data=data,method="POST",
        headers={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"video/mp4","x-upsert":"true"})
    urllib.request.urlopen(req,timeout=120)
    pub=base+"/storage/v1/object/public/reels/%s.mp4"%reel_id
    body=json.dumps({"video_url":pub,"status":"rendered"}).encode()
    req=urllib.request.Request(base+"/rest/v1/reel_scripts?id=eq.%s"%reel_id,data=body,method="PATCH",
        headers={"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json","Prefer":"return=minimal"})
    urllib.request.urlopen(req,timeout=30); return pub

def main():
    a=sys.argv[1:]
    if not a: print(__doc__); return
    if a[0]=="demo":
        row=json.load(open(a[1],encoding="utf-8")); M.build_reel(adapt(row),a[2]); print("wrote",a[2]); return
    if a[0]=="render":
        env=_env(); row=fetch_row(a[1],env); M.build_reel(adapt(row),a[2]); print("rendered",a[2])
        if "--publish" in a: print("published:",publish(a[1],a[2],env))
        return
    print(__doc__)

if __name__=="__main__": main()
