# مضمونة — Hero Films Publishing Workflow

دليل كامل لنشر الـ 3 hero films (Cosmos V4, Genesis V3, Storyboard V2) على السوشيال ميديا.

## 🎯 Quick Start

### الـ Path الأبسط (Silent video + add music in Canva):
```bash
cd C:\madmona-app\scripts\hero-videos
record.bat
```
→ Choose option 1 (Cosmos all formats)  
→ Wait ~3 minutes  
→ MP4 files appear in `output\` folder

### الـ Path الأقوى (Full audio capture):
```bash
obs-guide.bat
```
→ Follow OBS Studio steps  
→ ~5 minutes total

---

## 📋 Methods Comparison

| Method | Audio | Time | Difficulty | Best For |
|---|---|---|---|---|
| **A. Puppeteer auto** (`record.bat`) | ❌ Silent | 3 min | Easy (1 command) | Add music in Canva later |
| **B. OBS Studio** (`obs-guide.bat`) | ✅ Original drone | 5 min | Medium | Authentic experience |
| **C. Chrome + screen capture** (manual) | ✅ With effort | 10 min | Hard | If OBS doesn't work |

---

## Method A — Auto Recording with Puppeteer

### Setup (one-time only)
```bash
cd C:\madmona-app\scripts\hero-videos
npm install
```
This downloads Puppeteer + ffmpeg (~150 MB, 2-3 minutes).

### Record
```bash
record.bat
```
Or directly:
```bash
node record.js cosmos all      # Cosmos in 3 formats
node record.js all all         # All films, all formats (12 files)
node record.js cosmos portrait # Just Cosmos portrait
```

### Outputs
```
output\
├── cosmos_landscape_1920x1080.mp4    (~25 MB) → YouTube, Facebook feed
├── cosmos_portrait_1080x1920.mp4     (~25 MB) → IG Reel, TikTok, IG Story, YT Short
├── cosmos_square_1080x1080.mp4       (~15 MB) → Instagram feed post
├── genesis_landscape_1920x1080.mp4
├── genesis_portrait_1080x1920.mp4
├── ...
```

### ⚠️ About Audio
Puppeteer cannot capture Web Audio API output. The MP4 will be silent. Solutions:
1. **Add music in Canva**: Upload silent MP4 → Audio tab → Add free music (recommend "Cinematic" category)
2. **Add music in CapCut Mobile** (Egypt-friendly, free)
3. **Use Method B** (OBS) for original audio

---

## Method B — OBS Studio Recording

OBS captures everything the browser plays, including the Web Audio drone.

### Setup
1. Download OBS Studio: https://obsproject.com (free, ~150 MB)
2. Install + run once

### Quick recording
```bash
obs-guide.bat
```
Follow the steps shown.

### Settings for Reels/TikTok (portrait)
- Base Resolution: **1080x1920**
- FPS: **60**
- Format: **MP4**
- Browser Source: `https://madmonacairo.com/cosmos.html`
- Audio: **Desktop Audio** (so Web Audio captures)

### Settings for YouTube/Facebook (landscape)
- Base Resolution: **1920x1080**
- Same FPS + Format

---

## Method C — Quick Chrome Screen Capture

If OBS doesn't work, use Windows Game Bar:
1. Open Chrome → `https://madmonacairo.com/cosmos.html`
2. Press `F11` for fullscreen
3. Press `Win + G` → Click "Capture" → "Start Recording"
4. Wait 40 seconds
5. Press `Win + G` → Stop
6. Video saved to `C:\Users\YOU\Videos\Captures\`

---

## 🚀 Publishing the Videos

After you have the MP4 files, upload to each platform:

### Instagram Reel (portrait 1080x1920)
1. Open Instagram app on phone
2. Tap `+` → Reel
3. Upload `cosmos_portrait_1080x1920.mp4`
4. **Caption**: (already in `content_calendar` — query the DB)
5. **Hashtags**: `#مضمونة #احنا_بتوع_الإيجار #MadmonaCairo #رنتال_مصر #cinematic_ad`
6. **Cover**: Pick the moment where مضمونة wordmark appears (~32s)

### TikTok (portrait 1080x1920)
1. Open TikTok app
2. `+` → Upload
3. Same caption + hashtags
4. **Music**: Replace with trending Egyptian audio if going viral approach
5. Add **link in bio** to madmonacairo.com

### YouTube Short (portrait 1080x1920)
1. YouTube app → `+` → Short
2. Title: "مضمونة — احنا بتوع الإيجار 🌌 #Shorts"
3. Description: "كل حاجة ممكن تأجرها · مكان واحد · madmonacairo.com"
4. Tags: `مضمونة, رنتال مصر, إيجارات, hero ad`

### Facebook Page (landscape 1920x1080 OR square 1080x1080)
1. Facebook.com → Madmona page
2. Create post → Add video
3. Caption: pre-written in `content_calendar`
4. Cross-post to Instagram feed if needed

### Instagram Story (portrait, 15s only — needs trimming)
1. IG app → Story
2. Upload silent video OR record a teaser via OBS first 15s only
3. Add **link sticker** to cosmos.html for swipe-up

---

## 📊 Track Your Posts in the Database

After you publish each, update `content_calendar`:
```sql
UPDATE content_calendar 
SET status = 'published',
    published_at = NOW(),
    external_post_id = 'YOUR_IG_POST_ID',
    external_url = 'https://www.instagram.com/p/XXXXXXX/'
WHERE title LIKE '%Cosmos Hero Reel%';
```

Or just message Claude: "I posted cosmos on Instagram, the URL is X" — Claude will update.

---

## 🎬 Video Specs (Cosmos V4 — APPROVED STANDARD)

| Spec | Value |
|---|---|
| Duration | 38 seconds |
| Engine | Three.js r150 WebGL |
| Palette | Void #000204 + Gold #C9A04B + Amber #FF9B3E + Ember #E25822 |
| Fonts | Cairo + Tajawal + Cormorant Garamond Italic |
| Audio | 4-layer Web Audio (drone 40Hz + noise + crystal + rising tone) |
| Letterbox | 2.39:1 cinema |
| Particles | 3000 stars + 1800 dust + 18 fragments |
| Kinetic Slogan | 330/440/550/880 Hz word reveals |

---

## 🆘 Troubleshooting

### "npm install" fails
- Check Node.js installed: `node --version` (need v18+)
- Run as Administrator
- Clear cache: `npm cache clean --force` then retry

### Puppeteer hangs
- Add `--no-sandbox` (already in script)
- Try `headless: false` in record.js to see what's happening
- Increase memory: `set NODE_OPTIONS=--max-old-space-size=4096`

### OBS doesn't capture audio
- Settings → Audio → Desktop Audio = "Default"
- Browser Source → "Control audio via OBS" checkbox ✅
- Test by playing YouTube in any tab → should appear in OBS mixer

### Video too large (>100 MB)
- Re-encode in HandBrake (free) → "Web Optimized" preset → ~20 MB

### Instagram says "video too long"
- Reels max = 90 seconds (we're 38s ✅)
- Stories max = 15 seconds per slide (split into 3 stories OR use a 15s teaser)

---

## 🔗 Related

- **Live URLs**: madmonacairo.com/{cosmos,genesis,storyboard}.html
- **Database**: `ad_creatives` table (3 hero film entries) + `content_calendar` (6 scheduled posts)
- **System runbook**: `creative-quality-standard-v1` (the 12 quality criteria)
- **Cosmos V4 source**: Production-deployed (Vercel)
