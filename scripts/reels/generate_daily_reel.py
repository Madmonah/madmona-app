"""
Madmona — daily reel generator (Python + Pillow + ffmpeg).

Runs autonomously to:
  1. Fetch 5 fresh safe listings from Supabase (v_postiz_safe_listings)
  2. Render 7 frames (intro + 5 listings + outro) using Tajawal + Madmona brand
  3. Assemble a 27.6s vertical (1080x1920) reel with Ken Burns motion + music + crossfades
  4. Upload MP4 to Supabase Storage (bucket: generated-reels/daily/)
  5. Insert a row in generated_reels for tracking

Requires PIL/Pillow built with RAQM (HarfBuzz) for Arabic RTL shaping.
Linux/Mac: standard `pip install Pillow` works. Windows may need `Pillow-SIMD`
or Docker Linux env — validated in Anthropic cloud sandbox.

Env vars:
  SUPABASE_URL         (required) — e.g. https://mjhflxpxunwycbiquoig.supabase.co
  SUPABASE_SERVICE_KEY (required) — service-role key for storage upload + DB insert

  REEL_DIR         (default /tmp/madmona-reel-run)
  MUSIC_FILE       (default: sibling music/exmusichqlibre518664.mp3)
  FONTS_DIR        (default: sibling fonts/)
  LOGO_FULL_PATH   (default: sibling logo/madmona-full-clean.png)
  LOGO_MARK_PATH   (default: sibling logo/madmona-mark-final.png)
"""

from PIL import Image, ImageDraw, ImageFont, features
from io import BytesIO
import urllib.request, urllib.parse
import os, sys, json, subprocess, time, random

assert features.check('raqm'), "PIL must be built with RAQM for Arabic RTL"

HERE = os.path.dirname(os.path.abspath(__file__))
RUN  = os.environ.get('REEL_DIR', '/tmp/madmona-reel-run')
os.makedirs(f"{RUN}/frames", exist_ok=True)
os.makedirs(f"{RUN}/clips", exist_ok=True)

MUSIC     = os.environ.get('MUSIC_FILE',      f"{HERE}/music/exmusichqlibre518664.mp3")
FONTS_DIR = os.environ.get('FONTS_DIR',       f"{HERE}/fonts")
LOGO_FULL = Image.open(os.environ.get('LOGO_FULL_PATH', f"{HERE}/logo/madmona-full-clean.png")).convert('RGBA')
LOGO_MARK = Image.open(os.environ.get('LOGO_MARK_PATH', f"{HERE}/logo/madmona-mark-final.png")).convert('RGBA')

SUPA_URL = os.environ['SUPABASE_URL'].rstrip('/')
SUPA_KEY = os.environ['SUPABASE_SERVICE_KEY']

BRAND = {
    "green": (31, 111, 95), "green_dark": (14, 60, 48),
    "cream": (250, 250, 247), "gold": (212, 169, 74),
    "ink": (24, 32, 30), "muted": (150, 165, 158), "white": (255, 255, 255),
}
FONTS = {k: f"{FONTS_DIR}/Tajawal-{v}.ttf" for k, v in
         {"regular":"Regular","medium":"Medium","bold":"Bold","extrabold":"ExtraBold","black":"Black"}.items()}

def sb_get(path, params=None):
    url = f"{SUPA_URL}{path}"
    if params: url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}', 'Accept':'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read())

def sb_post(path, body):
    req = urllib.request.Request(f"{SUPA_URL}{path}", data=json.dumps(body).encode(), method='POST',
        headers={'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}',
                 'Content-Type':'application/json', 'Prefer':'return=representation'})
    with urllib.request.urlopen(req, timeout=30) as r: return json.loads(r.read())

def sb_upload(bucket, path, filepath, mime):
    data = open(filepath, 'rb').read()
    req = urllib.request.Request(f"{SUPA_URL}/storage/v1/object/{bucket}/{path}", data=data, method='POST',
        headers={'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}',
                 'Content-Type': mime, 'x-upsert': 'true'})
    with urllib.request.urlopen(req, timeout=120) as r: return json.loads(r.read())

def fmt_price(v):
    try: return f"{int(float(v)):,}"
    except: return str(v)

def fetch_img(url):
    req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return Image.open(BytesIO(r.read())).convert("RGB")

def cover(img, w, h):
    sw, sh = img.size; s = max(w/sw, h/sh)
    nw, nh = int(sw*s), int(sh*s)
    img = img.resize((nw, nh), Image.LANCZOS)
    return img.crop(((nw-w)//2, (nh-h)//2, (nw-w)//2+w, (nh-h)//2+h))

def gradient(w, h, top, bot):
    g = Image.new("RGBA", (w, h)); px = g.load()
    for y in range(h):
        t = y/max(h-1,1)
        c = tuple(int(top[i]+(bot[i]-top[i])*t) for i in range(4))
        for x in range(w): px[x, y] = c
    return g

def draw_rtl(d, xy, text, font, fill, align="right"):
    if not text: return
    b = d.textbbox((0,0), text, font=font, direction="rtl")
    tw = b[2]-b[0]; x, y = xy
    if align == "right": x -= tw
    elif align == "center": x -= tw//2
    d.text((x-b[0], y-b[1]), text, font=font, fill=fill, direction="rtl")

def draw_ltr(d, xy, text, font, fill, align="left"):
    if not text: return
    b = d.textbbox((0,0), text, font=font)
    tw = b[2]-b[0]; x, y = xy
    if align == "right": x -= tw
    elif align == "center": x -= tw//2
    d.text((x-b[0], y-b[1]), text, font=font, fill=fill)

def pin(size, color):
    ic = Image.new("RGBA", (size, size), (0,0,0,0))
    d = ImageDraw.Draw(ic); r = size/2
    d.ellipse((r*0.25, r*0.15, r*1.75, r*1.65), fill=color)
    d.polygon([(r*0.35, r*1.4),(r*1.65, r*1.4),(r, r*1.95)], fill=color)
    d.ellipse((r*0.75, r*0.65, r*1.25, r*1.15), fill=BRAND["cream"])
    return ic

def paste_scaled(canvas, img, cx, cy_top, target_h):
    lw, lh = img.size
    scale = target_h / lh
    nw = int(lw * scale)
    r = img.resize((nw, target_h), Image.LANCZOS)
    canvas.paste(r, (cx - nw // 2, cy_top), r)

def cream_badge(size):
    b = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(b)
    d.ellipse((0, 0, size, size), fill=BRAND["cream"])
    d.ellipse((6, 6, size-6, size-6), outline=BRAND["gold"], width=4)
    return b

def render_intro(out):
    W, H = 1080, 1920
    canvas = gradient(W, H, (14,60,48,255), (31,111,95,255)).convert("RGBA")
    BADGE = 700
    bx, by = (W-BADGE)//2, 380
    canvas.alpha_composite(cream_badge(BADGE), (bx, by))
    paste_scaled(canvas, LOGO_FULL, W//2, by + (BADGE-520)//2, 520)
    canvas = canvas.convert("RGB"); d = ImageDraw.Draw(canvas)
    draw_rtl(d, (W//2, by+BADGE+100), "معاملاتك مضمونة", ImageFont.truetype(FONTS["medium"], 68), BRAND["gold"], "center")
    draw_rtl(d, (W//2, by+BADGE+230), "عقارات · مطاعم · ماركت · خدمات", ImageFont.truetype(FONTS["regular"], 46), BRAND["cream"], "center")
    canvas.save(out, "PNG", optimize=True)

def render_outro(out):
    W, H = 1080, 1920
    canvas = gradient(W, H, (14,60,48,255), (31,111,95,255)).convert("RGBA")
    BADGE = 380
    bx, by = (W-BADGE)//2, 160
    canvas.alpha_composite(cream_badge(BADGE), (bx, by))
    paste_scaled(canvas, LOGO_FULL, W//2, by + (BADGE-280)//2, 280)
    canvas = canvas.convert("RGB"); d = ImageDraw.Draw(canvas)
    draw_rtl(d, (W//2, by+BADGE+100), "زور موقعنا دلوقتي", ImageFont.truetype(FONTS["black"], 100), BRAND["cream"], "center")
    draw_ltr(d, (W//2, by+BADGE+270), "madmonacairo.com", ImageFont.truetype(FONTS["extrabold"], 78), BRAND["gold"], "center")
    d.rectangle((W//2-300, by+BADGE+420, W//2+300, by+BADGE+426), fill=BRAND["gold"])
    draw_rtl(d, (W//2, by+BADGE+480), "أو كلّم المارد على واتساب", ImageFont.truetype(FONTS["bold"], 46), BRAND["cream"], "center")
    draw_ltr(d, (W//2, by+BADGE+580), "0100 222 9982", ImageFont.truetype(FONTS["black"], 92), BRAND["gold"], "center")
    draw_rtl(d, (W//2, H-220), "معاملاتك مضمونة", ImageFont.truetype(FONTS["extrabold"], 58), BRAND["cream"], "center")
    canvas.save(out, "PNG", optimize=True)

def render_listing_frame(l, out):
    W, H = 1080, 1920
    canvas = Image.new("RGB", (W, H), BRAND["cream"])
    hero_h = int(H * 0.68)
    try: hero = cover(fetch_img(l["photo"]), W, hero_h)
    except: hero = Image.new("RGB", (W, hero_h), BRAND["green"])
    canvas.paste(hero, (0, 0))
    canvas = canvas.convert("RGBA")
    canvas.alpha_composite(gradient(W, hero_h//3, (0,0,0,0), (0,0,0,180)), (0, hero_h - hero_h//3))
    canvas = canvas.convert("RGB")
    d = ImageDraw.Draw(canvas)
    if l.get("category"):
        cf = ImageFont.truetype(FONTS["bold"], 40)
        cbb = d.textbbox((0,0), l["category"], font=cf, direction="rtl")
        cw = cbb[2]-cbb[0] + 64; ch = 80
        ov = Image.new("RGBA", (W, H), (0,0,0,0))
        ImageDraw.Draw(ov).rounded_rectangle((W-60-cw, 60, W-60, 60+ch), radius=ch//2, fill=(*BRAND["green"], 235))
        canvas = Image.alpha_composite(canvas.convert("RGBA"), ov).convert("RGB")
        d = ImageDraw.Draw(canvas)
        draw_rtl(d, (W-92, 60+(ch-(cbb[3]-cbb[1]))//2 - 6), l["category"], cf, BRAND["cream"], "right")
    py = hero_h
    d.rectangle((70, py, W-70, py+4), fill=BRAND["gold"])
    title = str(l.get("title","")).strip()[:80]
    tsz = 60 if len(title) < 42 else 52
    tf = ImageFont.truetype(FONTS["bold"], tsz)
    words = title.split(); lines, cur = [], ""
    for w in words:
        test = f"{cur} {w}".strip()
        b = d.textbbox((0,0), test, font=tf, direction="rtl")
        if b[2]-b[0] <= W-140: cur = test
        else:
            if cur: lines.append(cur)
            cur = w
        if len(lines) >= 2: break
    if cur and len(lines) < 2: lines.append(cur)
    if len(lines) == 2 and len(" ".join(lines).split()) < len(words):
        lines[-1] = lines[-1].rstrip() + "…"
    ty = py + 44
    for line in lines:
        draw_rtl(d, (W-70, ty), line, tf, BRAND["ink"], "right")
        ty += tsz + 14
    bar_y = H - 160
    loc_y = bar_y - 100
    plabel_y = loc_y - 70
    price_y = plabel_y - 130
    draw_ltr(d, (W-70, price_y), fmt_price(l.get("price_egp",0)), ImageFont.truetype(FONTS["black"], 128), BRAND["green"], "right")
    draw_rtl(d, (W-70, plabel_y), "جنيه مصري", ImageFont.truetype(FONTS["medium"], 40), BRAND["muted"], "right")
    if l.get("location"):
        p = pin(52, BRAND["green"]); canvas.paste(p, (W-70-52, loc_y-6), p)
        draw_rtl(d, (W-70-68, loc_y), l["location"], ImageFont.truetype(FONTS["medium"], 40), BRAND["ink"], "right")
    paste_scaled(canvas, LOGO_MARK, 130, bar_y+10, 100)
    d = ImageDraw.Draw(canvas)
    d.text((260, bar_y+22), "MADMONA", font=ImageFont.truetype(FONTS["extrabold"], 40), fill=BRAND["ink"])
    draw_rtl(d, (620, bar_y+72), "معاملاتك مضمونة", ImageFont.truetype(FONTS["medium"], 28), BRAND["green"], "right")
    draw_ltr(d, (W-70, bar_y+40), "madmonacairo.com", ImageFont.truetype(FONTS["medium"], 32), BRAND["muted"], "right")
    canvas.save(out, "PNG", optimize=True)

def sh(*args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"cmd failed: {' '.join(args[:5])}...\n{r.stderr[-500:]}")
    return r

def build_video(frame_paths, out_path, music_path):
    FPS = 30
    clips = []
    for i, (fp, dur, motion) in enumerate(frame_paths):
        clip = f"{RUN}/clips/{i:02d}.mp4"
        clips.append(clip)
        frames = int(dur * FPS)
        if motion == "kenburns":
            vf = f"scale=2160:3840,zoompan=z='min(zoom+0.0009,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+ih*0.0002*on':d={frames}:s=1080x1920:fps={FPS}"
        else:
            vf = "scale=1080:1920,format=yuv420p"
        sh("ffmpeg","-y","-loop","1","-i",fp,"-vf",vf,"-t",str(dur),
           "-pix_fmt","yuv420p","-c:v","libx264","-preset","veryfast","-crf","20", clip)

    offsets = [2.6, 6.6, 10.6, 14.6, 18.6, 22.6]
    fc_parts = [f"[{i}:v]settb=AVTB,fps={FPS},format=yuv420p[v{i}];" for i in range(7)]
    cur = "v0"
    for i, off in enumerate(offsets, 1):
        nxt = f"x0{i}"
        fc_parts.append(f"[{cur}][v{i}]xfade=transition=fade:duration=0.4:offset={off}[{nxt}];")
        cur = nxt
    fc = "".join(fc_parts) + f"[{cur}]format=yuv420p[vout]"
    silent = f"{RUN}/silent.mp4"
    args = ["ffmpeg","-y"]
    for c in clips: args += ["-i", c]
    args += ["-filter_complex", fc, "-map","[vout]","-c:v","libx264","-pix_fmt","yuv420p","-preset","veryfast","-crf","20", silent]
    sh(*args)

    music_out = f"{RUN}/music.aac"
    sh("ffmpeg","-y","-i",music_path,"-t","27.6",
       "-af","afade=t=in:st=0:d=0.5,afade=t=out:st=25.6:d=2,volume=0.9",
       "-c:a","aac","-b:a","192k", music_out)

    sh("ffmpeg","-y","-i",silent,"-i",music_out,"-c:v","copy","-c:a","aac","-shortest","-movflags","+faststart", out_path)

def pick_listings(n=5):
    rows = sb_get('/rest/v1/v_postiz_safe_listings',
        {'select':'id,title,slug,city,district,price_egp,category,primary_photo_url',
         'primary_photo_url':'not.like.*wa-inbound*', 'price_egp':'gt.0', 'limit':'80'})
    since = time.strftime("%Y-%m-%d", time.gmtime(time.time()-14*86400))
    recent = sb_get('/rest/v1/generated_reels',
        {'select':'listing_ids', 'generated_at': f'gte.{since}'})
    used = set()
    for r in recent:
        for lid in (r.get('listing_ids') or []): used.add(lid)
    fresh = [r for r in rows if r['id'] not in used and r.get('primary_photo_url')]
    if len(fresh) < n:
        fresh = [r for r in rows if r.get('primary_photo_url')]
    picks = random.sample(fresh, min(n, len(fresh)))
    return [{
        "id": r["id"], "title": r["title"] or "إعلان مضمونة", "price_egp": r.get("price_egp") or 0,
        "location": ", ".join(x for x in [r.get("district"), r.get("city")] if x),
        "category": r.get("category") or "إعلان", "photo": r["primary_photo_url"],
    } for r in picks]

def main():
    print("[reel] picking 5 fresh listings…")
    listings = pick_listings(5)
    print(f"[reel] picked: {[l['title'][:40] for l in listings]}")

    print("[reel] rendering frames…")
    render_intro(f"{RUN}/frames/00-intro.png")
    for i, l in enumerate(listings, 1):
        render_listing_frame(l, f"{RUN}/frames/{i:02d}-listing.png")
    render_outro(f"{RUN}/frames/99-outro.png")

    print("[reel] assembling video…")
    frame_paths = [
        (f"{RUN}/frames/00-intro.png", 3, "static"),
    ] + [(f"{RUN}/frames/{i:02d}-listing.png", 4.4, "kenburns") for i in range(1, 6)] + [
        (f"{RUN}/frames/99-outro.png", 5, "static"),
    ]
    out = f"{RUN}/reel.mp4"
    build_video(frame_paths, out, MUSIC)
    size = os.path.getsize(out)
    print(f"[reel] built {out} ({size:,} bytes)")

    print("[reel] uploading to Supabase Storage…")
    day = time.strftime("%Y-%m-%d"); stamp = int(time.time())
    storage_path = f"daily/{day}-{stamp}.mp4"
    sb_upload("generated-reels", storage_path, out, "video/mp4")
    public_url = f"{SUPA_URL}/storage/v1/object/public/generated-reels/{storage_path}"
    print(f"[reel] public URL: {public_url}")

    row = sb_post('/rest/v1/generated_reels', {
        "video_url": public_url, "video_storage_path": storage_path,
        "duration_sec": 27.6, "size_bytes": size,
        "music_file": os.path.basename(MUSIC),
        "listing_ids": [l["id"] for l in listings],
        "listing_titles": [l["title"] for l in listings],
        "status": "ready", "campaign_tag": f"daily-{day}",
    })[0]
    print(f"[reel] ✓ DONE — id={row['id']}  url={public_url}")

    # 📢 Post to Telegram channel via Bot API (fully autonomous, no browser needed).
    #    Token stored in whatsapp_config table (key=telegram_bot_token).
    try:
        tg = sb_get('/rest/v1/whatsapp_config', {'select': 'key,value', 'key': 'in.(telegram_bot_token,telegram_channel_chat)'})
        tg_map = {r['key']: r['value'] for r in tg}
        token = tg_map.get('telegram_bot_token', '')
        chat  = tg_map.get('telegram_channel_chat', '@madmona_cairo')
        if token:
            bullets = "\n".join(f"• {t[:60]}" for t in [l['title'] for l in listings][:5])
            caption = (f"🚀 مضمونة — أحسن العروض اليوم:\n\n{bullets}\n\n"
                       f"👇 كل التفاصيل والحجز في الأب\nmadmonacairo.com\n\n"
                       f"أو كلّم المارد على واتساب: 0100 222 9982\n\n"
                       f"#مضمونة #القاهرة_الجديدة #عقارات #ريلز")
            body = urllib.parse.urlencode({
                'chat_id': chat, 'video': public_url, 'caption': caption,
                'parse_mode': 'HTML', 'supports_streaming': 'true',
            }).encode()
            req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendVideo", data=body, method='POST')
            with urllib.request.urlopen(req, timeout=90) as r:
                tg_res = json.loads(r.read())
            if tg_res.get('ok'):
                msg = tg_res['result']
                tg_url = f"https://t.me/{chat.lstrip('@')}/{msg['message_id']}"
                print(f"[reel] ✓ posted to Telegram: {tg_url}")
                # Record telegram publish on the row via PATCH
                try:
                    req = urllib.request.Request(f"{SUPA_URL}/rest/v1/generated_reels?id=eq.{row['id']}",
                        data=json.dumps({"status":"published","published_to":{"telegram":{"chat":chat,"message_id":msg['message_id'],"url":tg_url}}}).encode(),
                        method='PATCH',
                        headers={'apikey': SUPA_KEY, 'Authorization': f'Bearer {SUPA_KEY}',
                                 'Content-Type':'application/json','Prefer':'return=minimal'})
                    urllib.request.urlopen(req, timeout=10).read()
                except Exception as _: pass
            else:
                print(f"[reel] ⚠ Telegram post failed: {tg_res}")
    except Exception as e:
        print(f"[reel] ⚠ Telegram push errored: {e}")

    return row

if __name__ == "__main__":
    main()
