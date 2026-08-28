#!/usr/bin/env python3
# ============================================================================
# 🧞📞 marid_call.py — جسر بين مكالمة أستريسك والمارد
#
# (٢٨ أغسطس ٢٠٢٦) محمد: «اربط بالمارد».
#
# الفكرة: أستريسك بيسجّل كلام المتصل → السكريبت ده بيحوّله لنص →
#         يبعته لـ/api/chat (نفس المارد بتاع الشات والواتساب) →
#         ياخد الرد → يحوّله صوت → أستريسك يشغّله للمتصل.
#
# ⚠️ مهم: المارد هنا **إرشاد وترشيح بس** — نفس القاعدة المقفولة في
#    CLAUDE.md. مش بيبدأ كلام من نفسه ولا بينشئ إعلانات ولا بيعد بحاجة.
#
# ⚠️ التكلفة: تحويل الصوت لنص والعكس **بيستهلك من رصيد API**. القاعدة
#    الثابتة عند محمد: أي استهلاك لازم يتعرض بتكلفته ويتوافق عليه الأول.
#    عشان كده الوضع الافتراضي هنا OFFLINE (بيستخدم نص جاهز) لحد ما
#    محمد يوافق صراحةً على التشغيل الحي.
# ============================================================================
import sys, os, json, urllib.request, subprocess

AGI_ENV = {}
# قراءة متغيّرات AGI من أستريسك
while True:
    line = sys.stdin.readline().strip()
    if not line:
        break
    if ':' in line:
        k, v = line.split(':', 1)
        AGI_ENV[k.strip()] = v.strip()

def agi(cmd):
    """إرسال أمر لأستريسك وقراءة الرد"""
    sys.stdout.write(cmd + "\n")
    sys.stdout.flush()
    return sys.stdin.readline().strip()

def log(msg):
    sys.stderr.write(f"[marid_call] {msg}\n")
    sys.stderr.flush()

CALLER = AGI_ENV.get('agi_callerid', 'unknown')
SITE = os.environ.get('MADMONA_SITE', 'https://www.madmonacairo.com')
MODE = os.environ.get('MARID_MODE', 'offline')   # offline | live

log(f"مكالمة من {CALLER} — الوضع: {MODE}")

agi('ANSWER')
agi('EXEC Wait 1')

if MODE != 'live':
    # 🔇 الوضع الآمن: رد ثابت من غير أي استهلاك API
    log("وضع offline — رد ثابت بدون استهلاك API")
    agi('STREAM FILE hello-world ""')
    agi('EXEC Wait 1')
    agi('HANGUP')
    sys.exit(0)

# ── الوضع الحي (يتفعّل بموافقة محمد فقط) ────────────────────────────────
# ١) سجّل كلام المتصل (١٠ ثواني أو لحد سكوت ٢ ثانية)
rec = '/tmp/caller_%s' % CALLER.replace('+', '')
agi(f'RECORD FILE {rec} wav "#" 10000 0 s=2')

# ٢) حوّل الصوت لنص — محتاج خدمة تفريغ (بيستهلك API)
#    [يتفعّل بعد موافقة محمد على التكلفة]
text = ""
try:
    out = subprocess.run(['/usr/local/bin/stt.sh', rec + '.wav'],
                         capture_output=True, timeout=25)
    text = out.stdout.decode('utf-8', 'ignore').strip()
except Exception as e:
    log(f"STT فشل: {e}")

if not text:
    agi('STREAM FILE hello-world ""')
    agi('HANGUP')
    sys.exit(0)

log(f"المتصل قال: {text}")

# ٣) ابعت للمارد — نفس API الشات والواتساب
reply = ""
try:
    req = urllib.request.Request(
        f'{SITE}/api/chat',
        data=json.dumps({'phone': CALLER, 'message': text, 'summon': True}).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as r:
        reply = (json.load(r) or {}).get('reply') or ""
except Exception as e:
    log(f"المارد فشل: {e}")

log(f"المارد رد: {reply[:80]}")

# ٤) حوّل الرد لصوت وشغّله (بيستهلك API)
if reply:
    try:
        subprocess.run(['/usr/local/bin/tts.sh', reply, '/tmp/reply'],
                       capture_output=True, timeout=30)
        agi('STREAM FILE /tmp/reply ""')
    except Exception as e:
        log(f"TTS فشل: {e}")

agi('EXEC Wait 1')
agi('HANGUP')
