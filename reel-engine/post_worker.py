# -*- coding: utf-8 -*-
"""
Madmona POST design worker — the agents publish DESIGNED posts (not the bare genie).

Flow: content_calendar row -> render branded design (1080x1350, 4 styles) ->
upload to Cloudinary under madmona/mascots/designs/<id> (passes the publish gate AND
smart-image-picker with NO DB/edge change) -> set content_calendar.image_url ->
metricool-publish (the existing cron agent) publishes it.

Commands:
  python post_worker.py setup                       # download Cairo font + genie mascot
  python post_worker.py demo  row.json  out.png     # render a design locally (no DB)
  python post_worker.py run   [limit]  [--publish]  # fetch rows, render, upload, update DB

Env (.env): SUPABASE_URL, SUPABASE_SERVICE_KEY  (Cloudinary creds read from whatsapp_config).
Styles: offer | featured | trust | statement   (auto-picked per row; override with row["style"]).
"""
import os, re, sys, json, time, hashlib, uuid, urllib.request
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
HERE = os.path.dirname(os.path.abspath(__file__))
CLOUD = "duxfgqioc"
GENIE_URL = "https://res.cloudinary.com/duxfgqioc/image/upload/madmona/mascots/genie.png"
FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf"
def _fp():
    for c in (os.path.join(HERE,"CairoVF.ttf"), os.path.join(HERE,"fonts","CairoVF.ttf")):
        if os.path.exists(c): return c
    return os.path.join(HERE,"CairoVF.ttf")
FONT=_fp(); GENIE=os.path.join(HERE,"genie.png")
CREAM=(250,250,247); GREEN=(31,111,95); GREEN_D=(13,46,33); TEAL=(47,160,132); GOLD=(212,160,23); CSUB=(190,214,205); MUT=(120,125,120)
FEAT=["liga","calt"]; SITE="madmonacairo.com"; FOOT="  ·  معاملاتك مضمونة"

def setup():
    urllib.request.urlretrieve(FONT_URL, FONT); urllib.request.urlretrieve(GENIE_URL, GENIE)
    ImageFont.truetype(FONT,60); print("OK font+genie")

_fc={}
def font(w,s):
    k=(w,s)
    if k not in _fc:
        if HAS_RAQM:
            f=ImageFont.truetype(FONT,s)
            try: f.set_variation_by_axes([w,0])
            except Exception: pass
        else:
            p=_TAHOB if (w>=600 and os.path.exists(_TAHOB)) else _TAHO
            f=ImageFont.truetype(p if os.path.exists(p) else FONT,s)
        _fc[k]=f
    return _fc[k]
from PIL import features as _pf
HAS_RAQM=_pf.check("raqm")
_TAHO=r"C:\Windows\Fonts\tahoma.ttf"; _TAHOB=r"C:\Windows\Fonts\tahomabd.ttf"
if not HAS_RAQM:
    import arabic_reshaper as _ar
    from bidi.algorithm import get_display as _bd
def ar(s): return any('؀'<=c<='ۿ' or 'ݐ'<=c<='ݿ' for c in str(s))
def _shape(s):
    s=str(s)
    if HAS_RAQM: return s, dict(direction=("rtl" if ar(s) else "ltr"), features=FEAT)
    if ar(s): return _bd(_ar.reshape(s)), {}   # pre-shape (Windows Pillow has no raqm)
    return s, {}
def T(d,x,y,s,f,fill,a="mm"):
    t,kw=_shape(s); d.text((x,y),t,font=f,fill=fill,anchor=a,**kw)
def meas(d,s,f):
    t,kw=_shape(s); b=d.textbbox((0,0),t,font=f,anchor="la",**kw); return b[2]-b[0],b[3]-b[1]
def wf(d,t,mw,ml,start,w):
    ws=str(t).split(); ln=[]
    for sz in range(start,40,-6):
        f=font(w,sz); ln=[]; cur=""
        for x in ws:
            tt=(cur+" "+x).strip()
            if meas(d,tt,f)[0]<=mw: cur=tt
            else:
                if cur: ln.append(cur)
                cur=x
        if cur: ln.append(cur)
        if len(ln)<=ml and all(meas(d,l,f)[0]<=mw for l in ln): return f,ln
    return font(w,40),ln
def pill(d,cx,cy,t,f,bg,tx,px=54,py=30):
    tw,th=meas(d,t,f); w=tw+2*px; h=th+2*py
    d.rounded_rectangle([cx-w/2,cy-h/2,cx+w/2,cy+h/2],h/2,fill=bg); T(d,cx,cy,t,f,tx)
def mascot(img,d,cx,cy,r):
    if not os.path.exists(GENIE): return
    cx,cy,r=int(cx),int(cy),int(r)
    g=Image.open(GENIE).convert("RGB").resize((2*r,2*r))
    m=Image.new("L",(2*r,2*r),0); ImageDraw.Draw(m).ellipse([0,0,2*r,2*r],fill=255)
    img.paste(g,(cx-r,cy-r),m); d.ellipse([cx-r-7,cy-r-7,cx+r+7,cy+r+7],outline=GOLD,width=7)
def chk(d,cx,cy,r):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(212,160,23,40),outline=GOLD,width=6)
    d.line([(cx-r*0.42,cy+r*0.02),(cx-r*0.06,cy+r*0.40)],fill=GOLD,width=8)
    d.line([(cx-r*0.06,cy+r*0.40),(cx+r*0.5,cy-r*0.40)],fill=GOLD,width=8)
_K=re.compile(r"[^؀-ۿݐ-ݿ٠-٩A-Za-z0-9 \.\,\!\?\:\%·—\-\/«»]")
def cl(s): return _K.sub("",str(s or "")).replace("  "," ").strip(" .·-—")
def prc(p):
    try: return "{:,}".format(int(float(p)))
    except Exception: return str(p)
def _words(s,n): return " ".join(str(s).split()[:n])
def head(row):
    t=cl(row.get("title") or "")
    for sep in ("؟","!","،",":","\n","."):
        i=t.find(sep)
        if 0<i<=60: t=t[:i]; break
    return (_words(t,7)[:46]).strip() or "معاملاتك مضمونة"
def kick(row,default="مضمونة"):
    c=cl(row.get("category") or "")
    return c if (c and ar(c) and len(c.split())<=3) else default
def cta_of(row,default="ضيف ليستنجك دلوقتي"):
    c=cl(row.get("cta") or "")
    c=" ".join(w for w in c.split() if "." not in w and "/" not in w and "http" not in w.lower())
    return (_words(c,5)[:34]).strip() or default

def s_offer(row):
    t=head(row); c=kick(row,"عرض مضمونة"); p=row.get("price"); cta=cta_of(row,"اطلبه دلوقتي على مضمونة")
    img=Image.new("RGB",(W,H),GREEN_D); d=ImageDraw.Draw(img,"RGBA")
    d.ellipse([W-260,-160,W+260,360],fill=(212,160,23,26)); d.ellipse([-220,H-360,300,H+160],fill=(47,160,132,28))
    d.text((W/2,72),"MADMONA",font=font(900,40),fill=GOLD,anchor="mm")
    pill(d,W-200,155,"عرض مضمونة",font(900,34),GOLD,GREEN_D,px=36,py=20); mascot(img,d,205,168,76)
    T(d,W/2,480,c,font(700,42),GOLD)
    f,ln=wf(d,t,900,3,80,900); lh=meas(d,"AA",f)[1]+24; y=(700 if p else 760)-(len(ln)*lh)/2+lh/2
    for l in ln: T(d,W/2,y,l,f,CREAM); y+=lh
    if p: T(d,W/2,y+30,"السعر",font(600,40),CSUB); T(d,W/2,y+150,prc(p),font(900,140),GOLD); T(d,W/2,y+250,"جنيه مصري",font(700,44),CREAM); y+=300
    pill(d,W/2,y+90,cta,font(900,46),GOLD,GREEN_D,px=60,py=34)
    T(d,W/2,H-70,SITE+FOOT,font(700,34),GOLD); return img

def s_featured(row):
    t=head(row); c=kick(row,"متاح الآن"); p=row.get("price"); cta=cta_of(row,"اطلبه على مضمونة")
    img=Image.new("RGB",(W,H),CREAM); d=ImageDraw.Draw(img,"RGBA")
    d.rectangle([0,0,W,26],fill=GOLD); d.ellipse([-200,H-300,260,H+160],fill=(31,111,95,16))
    d.text((W/2,80),"MADMONA",font=font(900,40),fill=TEAL,anchor="mm")
    pill(d,W-180,160,"متاح الآن",font(900,34),GREEN,CREAM,px=36,py=20); mascot(img,d,200,170,74)
    T(d,W/2,490,c,font(700,42),GOLD)
    f,ln=wf(d,t,900,3,78,900); lh=meas(d,"AA",f)[1]+24; y=(700 if p else 770)-(len(ln)*lh)/2+lh/2
    for l in ln: T(d,W/2,y,l,f,GREEN); y+=lh
    if p: pill(d,W/2,y+80,prc(p)+" ج.م",font(900,72),GOLD,GREEN_D,px=64,py=34); y+=200
    pill(d,W/2,y+70,cta,font(900,46),GREEN,CREAM,px=60,py=34)
    T(d,W/2,H-70,SITE+FOOT,font(700,34),GREEN); return img

def s_trust(row):
    hd=head(row)
    img=Image.new("RGB",(W,H),CREAM); d=ImageDraw.Draw(img,"RGBA")
    d.ellipse([-200,-200,260,260],fill=(31,111,95,16))
    d.text((W/2,80),"MADMONA",font=font(900,40),fill=TEAL,anchor="mm")
    T(d,W/2,290,"ليه مضمونة؟",font(700,46),GOLD)
    f,ln=wf(d,hd,920,2,90,900); lh=meas(d,"AA",f)[1]+48; y=445-(len(ln)*lh)/2+lh/2
    for l in ln: T(d,W/2,y,l,f,GREEN); y+=lh
    d.rounded_rectangle([W/2-150,y+8,W/2+150,y+34],13,fill=GOLD)
    rows=["موردين موثّقين ومراجَعين","حماية كاملة على كل صفقة","دفع آمن — كاش أو إنستاباي"]; yy=y+130
    for r in rows: chk(d,160,yy,46); T(d,940,yy,r,font(700,50),GREEN,a="rm"); yy+=140
    mascot(img,d,W//2,yy+70,88)
    T(d,W/2,H-70,SITE+FOOT,font(700,34),GREEN); return img

def s_statement(row):
    c=kick(row); t=head(row); sub=""; cta=cta_of(row,"اعرف أكتر على مضمونة")
    img=Image.new("RGB",(W,H),GREEN); d=ImageDraw.Draw(img,"RGBA")
    d.ellipse([W-300,H-300,W+200,H+200],fill=(212,160,23,22))
    d.text((W/2,80),"MADMONA",font=font(900,40),fill=GOLD,anchor="mm")
    mascot(img,d,W//2,300,92); T(d,W/2,500,c,font(700,44),GOLD)
    f,ln=wf(d,t,920,3,96,900); lh=meas(d,"AA",f)[1]+18; y=720-(len(ln)*lh)/2+lh/2
    for l in ln: T(d,W/2,y,l,f,CREAM); y+=lh
    if sub: T(d,W/2,y+30,sub,font(600,44),CSUB); y+=90
    pill(d,W/2,y+90,cta,font(900,46),CREAM,GREEN,px=60,py=34)
    T(d,W/2,H-70,SITE+FOOT,font(700,34),GOLD); return img

STYLES={"offer":s_offer,"featured":s_featured,"trust":s_trust,"statement":s_statement}
def pick_style(row):
    h=int(hashlib.md5(str(row.get("id","x")).encode()).hexdigest(),16)
    return (["offer","featured"][h%2] if row.get("price") else ["trust","statement"][h%2])
def render_post(row):
    return STYLES.get(row.get("style") or pick_style(row), s_statement)(row)

# ---------------- Supabase + Cloudinary ----------------
def _env():
    e={}; p=os.path.join(HERE,".env")
    if os.path.exists(p):
        for ln in open(p,encoding="utf-8"):
            ln=ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k,v=ln.split("=",1); e[k.strip()]=v.strip()
    e.setdefault("SUPABASE_URL",os.environ.get("SUPABASE_URL",""))
    e.setdefault("SUPABASE_SERVICE_KEY",os.environ.get("SUPABASE_SERVICE_KEY",""))
    return e
def _get(env,path):
    req=urllib.request.Request(env["SUPABASE_URL"].rstrip("/")+"/rest/v1/"+path,
        headers={"apikey":env["SUPABASE_SERVICE_KEY"],"Authorization":"Bearer "+env["SUPABASE_SERVICE_KEY"]})
    return json.load(urllib.request.urlopen(req,timeout=30))
def _patch(env,path,body):
    req=urllib.request.Request(env["SUPABASE_URL"].rstrip("/")+"/rest/v1/"+path,data=json.dumps(body).encode(),method="PATCH",
        headers={"apikey":env["SUPABASE_SERVICE_KEY"],"Authorization":"Bearer "+env["SUPABASE_SERVICE_KEY"],
                 "Content-Type":"application/json","Prefer":"return=minimal"})
    urllib.request.urlopen(req,timeout=30)
def _cfg(env,key):
    r=_get(env,"whatsapp_config?key=eq.%s&select=value"%key); return r[0]["value"] if r else ""
def cloudinary_upload(path,public_id,key,secret):
    ts=int(time.time()); sig=hashlib.sha1(("overwrite=true&public_id=%s&timestamp=%d%s"%(public_id,ts,secret)).encode()).hexdigest()
    b="----mad"+uuid.uuid4().hex; body=b""
    for k,v in {"public_id":public_id,"overwrite":"true","timestamp":str(ts),"api_key":key,"signature":sig}.items():
        body+=("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n"%(b,k,v)).encode()
    body+=("--%s\r\nContent-Disposition: form-data; name=\"file\"; filename=\"p.png\"\r\nContent-Type: image/png\r\n\r\n"%b).encode()
    body+=open(path,"rb").read()+("\r\n--%s--\r\n"%b).encode()
    req=urllib.request.Request("https://api.cloudinary.com/v1_1/%s/image/upload"%CLOUD,data=body,method="POST",
        headers={"Content-Type":"multipart/form-data; boundary=%s"%b})
    return json.load(urllib.request.urlopen(req,timeout=120))["secure_url"]

def run(limit,publish):
    env=_env()
    if not env["SUPABASE_SERVICE_KEY"]: print("ERROR: set SUPABASE_SERVICE_KEY in .env"); return
    rows=_get(env,("content_calendar?select=id,title,body,cta,category,image_url,status"
                   "&content_type=in.(instagram_post,facebook_post,google_post)"
                   "&status=in.(drafted,pending_review,approved)&published_at=is.null&order=created_at.desc&limit=%d"%limit))
    key=_cfg(env,"cloudinary_api_key"); sec=_cfg(env,"cloudinary_api_secret"); done=[]
    for r in rows:
        if r.get("image_url") and "madmona/mascots/designs/" in r["image_url"]: continue
        out=os.path.join(HERE,"_post_%s.png"%r["id"]); render_post(r).save(out)
        if publish:
            url=cloudinary_upload(out,"madmona/mascots/designs/%s"%r["id"],key,sec)
            _patch(env,"content_calendar?id=eq.%s"%r["id"],{"image_url":url,"image_source":"mared_mascot","visual_status":"ready"})
            done.append({"id":r["id"],"url":url})
        else: done.append({"id":r["id"],"rendered":out})
        try:
            if publish: os.remove(out)
        except Exception: pass
    print(json.dumps({"processed":len(done),"published":publish,"items":done},ensure_ascii=False,indent=2))

def main():
    a=sys.argv[1:]
    if not a: print(__doc__); return
    if a[0]=="setup": setup(); return
    if a[0]=="demo": render_post(json.load(open(a[1],encoding="utf-8"))).save(a[2]); print("wrote",a[2]); return
    if a[0]=="run": run(int(a[1]) if len(a)>1 and a[1].isdigit() else 10, "--publish" in a); return
    print(__doc__)

if __name__=="__main__": main()
