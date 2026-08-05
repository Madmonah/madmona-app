# Madmona Reels — Playwright Automation

Records Claude Design shorts as MP4 videos and publishes them to social platforms using Mohamed's logged-in browser session.

## First-time setup (once)

```powershell
cd E:\madmona-app
npm install --save-dev playwright ffmpeg-static
npx playwright install chromium
```

## One-time login (headed run — Mohamed logs in manually)

The Playwright profile at `scripts/reels/playwright/profile/` starts empty. First time each site is used, we run headed so Mohamed can log in — cookies persist for all future headless runs.

```powershell
cd E:\madmona-app\scripts\reels\playwright
node record-design.js "شورت ١ - سؤال وجواب.dc.html" 30
```

The browser opens. Mohamed logs in to claude.ai. Design plays. Recording saves to `output/*.mp4`.

## Daily record + publish

```powershell
cd E:\madmona-app\scripts\reels\playwright

# 1. Record the design (any of the 3 shorts)
node record-design.js "شورت ١ - سؤال وجواب.dc.html" 30
# → output/<timestamp>_شورت_١_-_سؤال_وجواب.mp4

# 2. Publish to Facebook
node publish-facebook.js "output/2026-08-05T09-00-00_شورت_١.mp4"

# (Later — publish-instagram.js, publish-tiktok.js, etc.)
```

## Windows Task Scheduler

Once tested, wrap in a `.bat` file:

```batch
@echo off
cd /d E:\madmona-app\scripts\reels\playwright
node record-design.js "شورت ١ - سؤال وجواب.dc.html" 30 > logs\rec.log 2>&1
for /f %%f in ('dir /b /o-d output\*.mp4') do set LATEST=%%f & goto :publish
:publish
node publish-facebook.js "output\%LATEST%" > logs\fb.log 2>&1
```

Then Task Scheduler → Create Task → Trigger: Daily 9:00 AM → Action: run the .bat.

## Platforms priority

1. ✅ **Facebook personal** (working via `publish-facebook.js`) — has native Reel support
2. ⏳ **Instagram personal** — similar flow, `publish-instagram.js` next
3. ⏳ **TikTok** — accepts drag-drop MP4 on tiktok.com/upload
4. ⏳ **Pinterest** — Business Hub, Create Pin, upload MP4
5. ⏳ **LinkedIn** — feed post with video attachment
6. ⏳ **Threads** — similar to IG (same Meta login)
7. ⏳ **YouTube Shorts** — YouTube Studio upload

## Debugging

If a publish script hangs, run headed (edit script `headless: false`) and watch. Usually:
- Session expired → re-login
- UI changed → update selectors
- CAPTCHA → manual click needed (leave headed)
