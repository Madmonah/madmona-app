# Madmona Reel Renderer

تحويل الـ reel scripts من DB لـ MP4 videos جاهزة للنشر على Instagram.

## كيف يشتغل

```
reel_scripts (Supabase)
    ↓
Pexels API → جلب stock video لكل scene
    ↓
FFmpeg → trim + scale 9:16 + dark overlay box
    ↓
Concat جميع الـ scenes
    ↓
إضافة موسيقى (لو موجودة في music/default.mp3)
    ↓
رفع لـ Supabase Storage (bucket: reels)
    ↓
تحديث reel_scripts.video_url + status='rendered'
```

## أول مرة (Setup):

### 1. Pexels API Key (مجاني)
- روح https://www.pexels.com/api/
- اضغط "Get Started" → سجل بـ Gmail
- خد الـ API key
- ضيفه في `.env.local`:
  ```
  PEXELS_API_KEY=YOUR_KEY_HERE
  ```

### 2. (اختياري) موسيقى خلفية
- نزّل MP3 royalty-free من:
  - https://pixabay.com/music/ (بدون signup)
  - https://www.bensound.com/
- احفظه باسم `default.mp3` في `scripts/reels/music/`

### 3. Dependencies
أول تشغيل لـ `render-reels.bat` هيـ install تلقائياً:
- `ffmpeg-static` (FFmpeg binary)
- `node-fetch@2`
- `dotenv`

## التشغيل:

```bash
# دبل-كليك
scripts/reels/render-reels.bat
```

ثم اختار:
1. **Latest reel** (تجربة سريعة - reel واحد)
2. **All drafted** (كل الـ 7+ reels مرة واحدة)
3. **Specific ID** (reel معين)

## Output:

- `scripts/reels/output/<reel_id>.mp4` — الفيديو النهائي
- يـ upload تلقائياً لـ Supabase Storage
- `/admin/reels` بيعرض الـ video_url

## Limitations:

- **النص العربي**: drawtext في FFmpeg مش بيدعم Arabic shaping بشكل ممتاز. الـ overlay الحالي بيحط dark box بس بدون نص. لو محتاج نص عربي بشكل احترافي، الحل:
  - إنت تضيف الـ captions بعدين في Instagram (أسهل)
  - أو نـ migrate لـ Remotion / Cloudinary لو احتجت

- **Pexels Quality**: الـ stock videos متغيرة. الـ script بيختار الأقرب لـ portrait 9:16.

- **مدة كل scene**: لو الـ stock video أقصر من duration_sec، الـ scene هيكون مدته أقصر. الحل: زيادة `duration_sec` في الـ scene للـ minimum 3 ثواني.

## ميزات مستقبلية:

- [ ] Arabic text rendering عبر libass/ASS subtitles
- [ ] Per-scene music selection
- [ ] Voice-over generation (TTS عربي)
- [ ] Auto-publish to Instagram
- [ ] Scheduled rendering في cron
