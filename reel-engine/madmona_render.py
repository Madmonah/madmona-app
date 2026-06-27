# -*- coding: utf-8 -*-
"""Madmona unified design/render engine — POSTS (PNG) and REELS (MP4).
  python madmona_render.py --setup
  python madmona_render.py post spec.json out.png
  python madmona_render.py reel spec.json out.mp4
Templates: hook|statement|text|chips|checklist|steps|cards|cta  Themes: light|green|dark
Needs: pip install pillow (built with raqm)  +  ffmpeg on PATH (reels only)."""
import os, sys, json, subprocess, tempfile, urllib.request
from PIL import Image, ImageDraw, ImageFont
W, H = 1080, 1920
HERE = os.path.dirname(os.path.abspath(__file__))
FONT_URL = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf"
def font_path():
    for c in (os.path.join(HERE,"CairoVF.ttf"), os.path.join(HERE,"fonts","CairoVF.ttf")):
        if os.path.exists(c): return c
    return os.path.join(HERE,"CairoVF.ttf")
FONT = font_path()
FFMPEG = os.environ.get("MADMONA_FFMPEG") or (os.path.join(HERE,"ffmpeg.exe") if os.path.exists(os.path.join(HERE,"ffmpeg.exe")) else "ffmpeg")
CREAM=(250,250,247); GREEN=(31,111,95); GREEN_D=(15,51,36)
TEAL=(47,160,132); GOLD=(212,160,23); MUT=(95,100,96); CSUB=(199,225,217)
FEAT=["liga","calt"]
THEMES={"light":(CREAM,GREEN,False),"green":(GREEN,CREAM,True),"dark":(GREEN_D,CREAM,True)}
def setup():
    urllib.request.urlretrieve(FONT_URL, FONT); ImageFont.truetype(FONT,60); print("OK")
_fc={}
def font(weight,size):
    k=(weight,size)
    if k not in _fc:
        if HAS_RAQM:
            f=ImageFont.truetype(FONT,size)
            try: f.set_variation_by_axes([weight,0])
            except Exception: pass
        else:
            p=_TAHOB if (weight>=600 and os.path.exists(_TAHOB)) else _TAHO
            f=ImageFont.truetype(p if os.path.exists(p) else FONT,size)
        _fc[k]=f
    return _fc[k]
from PIL import features as _pf
HAS_RAQM=_pf.check("raqm")
_TAHO=r"C:\Windows\Fonts\tahoma.ttf"; _TAHOB=r"C:\Windows\Fonts\tahomabd.ttf"
if not HAS_RAQM:
    import arabic_reshaper as _ar
    from bidi.algorithm import get_display as _bd
def has_ar(s): return any('؀'<=c<='ۿ' or 'ݐ'<=c<='ݿ' for c in str(s))
def _shape(s):
    s=str(s)
    if HAS_RAQM: return s, dict(direction=("rtl" if has_ar(s) else "ltr"), features=FEAT)
    if has_ar(s): return _bd(_ar.reshape(s)), {}
    return s, {}
def T(d,x,y,s,f,fill,anchor="mm"):
    t,kw=_shape(s); d.text((x,y),t,font=f,fill=fill,anchor=anchor,**kw)
def measure(d,s,f):
    t,kw=_shape(s); b=d.textbbox((0,0),t,font=f,anchor="la",**kw); return b[2]-b[0],b[3]-b[1]
def bars(d,n,total,dark):
    if total<=1: return
    pad=44; gap=12; top=70; w=(W-2*pad-(total-1)*gap)/total
    for i in range(total):
        x=pad+i*(w+gap)
        d.rounded_rectangle([x,top,x+w,top+9],4,fill=(255,255,255,60) if dark else (210,205,195))
        if i<=n: d.rounded_rectangle([x,top,x+w,top+9],4,fill=GOLD)
def chrome(d,dark):
    d.text((W/2,150),"MADMONA",font=font(900,46),fill=GOLD if dark else TEAL,anchor="mm")
    T(d,W/2,H-120,"معاملاتك مضمونة",font(700,40),CREAM if dark else GREEN)
def canvas(theme):
    bgc,fg,dark=THEMES.get(theme,THEMES["light"])
    img=Image.new("RGB",(W,H),bgc); return img,ImageDraw.Draw(img,"RGBA"),fg,dark
def pill(d,cx,cy,text,f,bgc,txc,padx=46,pady=30,border=None):
    tw_,th_=measure(d,text,f); w=tw_+2*padx; h=th_+2*pady
    box=[cx-w/2,cy-h/2,cx+w/2,cy+h/2]
    if bgc: d.rounded_rectangle(box,h/2,fill=bgc)
    if border: d.rounded_rectangle(box,h/2,outline=border,width=6)
    T(d,cx,cy,text,f,txc); return w
def chips_block(d,cy,items,f,maxw=920,gap=26,padx=44):
    sizes=[measure(d,l,f)[0]+2*padx for l,_ in items]
    rows=[]; cur=[]; cw=0
    for (l,st),w in zip(items,sizes):
        if cur and cw+gap+w>maxw: rows.append((cur,cw)); cur=[]; cw=0
        cw+=(gap if cur else 0)+w; cur.append((l,st,w))
    if cur: rows.append((cur,cw))
    rh=measure(d,"AA",f)[1]+62
    y=cy-(len(rows)*rh+(len(rows)-1)*24)/2+rh/2
    for row,rw in rows:
        x=W/2-rw/2
        for l,st,w in row:
            cx=x+w/2
            if st=="green": pill(d,cx,y,l,f,GREEN,CREAM)
            elif st=="gold": pill(d,cx,y,l,f,GOLD,GREEN_D)
            else: pill(d,cx,y,l,f,None,GREEN,border=TEAL)
            x+=w+gap
        y+=rh+24
def check(d,cx,cy,r):
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(212,160,23,40),outline=GOLD,width=6)
    d.line([(cx-r*0.42,cy+r*0.02),(cx-r*0.06,cy+r*0.40)],fill=GOLD,width=9)
    d.line([(cx-r*0.06,cy+r*0.40),(cx+r*0.5,cy-r*0.40)],fill=GOLD,width=9)
def _wrap_fit(d,text,max_w,max_lines,start,weight):
    words=str(text).split(); lines=[]
    for size in range(start,38,-6):
        f=font(weight,size); lines=[]; cur=""
        for w in words:
            t=(cur+" "+w).strip()
            if measure(d,t,f)[0]<=max_w: cur=t
            else:
                if cur: lines.append(cur)
                cur=w
        if cur: lines.append(cur)
        if len(lines)<=max_lines and all(measure(d,l,f)[0]<=max_w for l in lines):
            return f,lines
    return font(weight,40),lines
def t_hook(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,470,s["kicker"],font(700,46),GOLD if dark else GREEN)
    T(d,W/2,840,s.get("title",""),font(900,200),fg)
    if s.get("accent"): T(d,W/2,1060,s["accent"],font(900,200),GOLD)
    d.rounded_rectangle([W/2-150,1205,W/2+150,1233],14,fill=GOLD)
def t_statement(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,470,s["kicker"],font(700,48),GOLD)
    lines=s.get("lines",[s.get("title","")]); y=720
    for ln in lines: T(d,W/2,y,ln,font(900,118),fg); y+=135
    if s.get("sub"): T(d,W/2,max(y+90,1075),s["sub"],font(600,50),CSUB if dark else MUT)
def t_text(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,440,s["kicker"],font(700,48),GOLD)
    f,lines=_wrap_fit(d,s.get("text",""),900,4,s.get("size",104),900)
    lh=measure(d,"AA",f)[1]+34; y=960-(len(lines)*lh)/2+lh/2
    for ln in lines: T(d,W/2,y,ln,f,fg); y+=lh
    if s.get("sub"): T(d,W/2,y+40,s["sub"],font(600,46),CSUB if dark else MUT)
def t_chips(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,440,s["kicker"],font(700,52),GOLD if dark else GREEN)
    chips_block(d,960,[(i[0],i[1]) for i in s.get("items",[])],font(700,58))
    if s.get("sub"): T(d,W/2,1360,s["sub"],font(600,46),CSUB if dark else MUT)
def t_checklist(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,430,s["kicker"],font(700,50),GOLD)
    y=660
    for r in s.get("rows",[]):
        check(d,170,y,54); T(d,1000,y,r,font(700,54),fg,anchor="rm"); y+=210
def t_steps(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,430,s["kicker"],font(700,50),GOLD if dark else GREEN)
    y=730
    for n,t,sub in s.get("steps",[]):
        T(d,930,y,n,font(900,116),GOLD,anchor="rm")
        T(d,770,y-36,t,font(900,72),fg if dark else GREEN,anchor="rm")
        T(d,770,y+44,sub,font(500,42),CSUB if dark else MUT,anchor="rm"); y+=250
def t_cards(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,400,s["kicker"],font(700,50),GOLD)
    if s.get("title"): T(d,W/2,560,s["title"],font(900,88),fg)
    y=730
    for t,sub in s.get("cards",[]):
        d.rounded_rectangle([90,y,W-90,y+250],28,fill=(255,255,255,16),outline=(212,160,23,120),width=4)
        T(d,W-150,y+82,t,font(700,56),GOLD,anchor="rm")
        T(d,W-150,y+168,sub,font(500,40),CSUB,anchor="rm"); y+=300
def t_cta(d,s,fg,dark):
    if s.get("kicker"): T(d,W/2,460,s["kicker"],font(700,50),GOLD)
    T(d,W/2,710,s.get("title",""),font(900,150),fg)
    if s.get("pill"): pill(d,W/2,945,s["pill"],font(900,62),GOLD,GREEN_D,padx=58,pady=36)
    y=1165
    for ln in s.get("lines",[]):
        T(d,W/2,y,ln,font(700,58),GOLD if not has_ar(ln) else fg); y+=120
TEMPLATES={"hook":t_hook,"statement":t_statement,"text":t_text,"chips":t_chips,"checklist":t_checklist,"steps":t_steps,"cards":t_cards,"cta":t_cta}
def render_scene(s,idx,total,show_bars=True):
    img,d,fg,dark=canvas(s.get("theme","light"))
    TEMPLATES[s["template"]](d,s,fg,dark); chrome(d,dark)
    if show_bars: bars(d,idx,total,dark)
    return img
def build_reel(spec,out):
    scenes=spec["scenes"]; total=len(scenes); tmp=tempfile.mkdtemp(prefix="mreel_"); paths=[]
    for i,s in enumerate(scenes):
        p=os.path.join(tmp,"%02d.png"%i); render_scene(s,i,total,True).save(p); paths.append((p,float(s.get("duration",4.0))))
    Tx=0.5; ins=[]
    for p,dur in paths: ins+=["-loop","1","-t",str(dur),"-i",p]
    fc=["[%d:v]scale=1080:1920,setsar=1,fps=24,format=yuv420p[v%d]"%(i,i) for i in range(len(paths))]
    off=0.0; last="v0"
    for i in range(1,len(paths)):
        off+=paths[i-1][1]-Tx; lbl="x%d"%i
        fc.append("[%s][v%d]xfade=transition=fade:duration=%s:offset=%.2f[%s]"%(last,i,Tx,off,lbl)); last=lbl
    args=[FFMPEG,"-y","-loglevel","error",*ins,"-filter_complex",";".join(fc),"-map","[%s]"%last,"-c:v","libx264","-preset","veryfast","-crf","22","-pix_fmt","yuv420p","-movflags","+faststart",out]
    subprocess.run(args,check=True); return out
def build_post(spec,out):
    render_scene(spec["scenes"][0],0,1,show_bars=False).save(out); return out
def main():
    a=sys.argv[1:]
    if not a: print("usage: post|reel spec.json out  | --setup"); return
    if a[0]=="--setup": setup(); return
    mode,spec_path,out=a[0],a[1],a[2]
    if not os.path.exists(FONT): setup()
    spec=json.load(open(spec_path,encoding="utf-8"))
    {"reel":build_reel,"post":build_post}[mode](spec,out); print("wrote",out)
if __name__=="__main__": main()
