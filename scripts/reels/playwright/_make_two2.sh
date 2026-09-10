#!/usr/bin/env bash
# يبني ويسجّل ريلين (الصوت موجود بالفعل vo-<slug>-lahajati.mp3) — بعد باتش مشهد phone
set -u
cd /e/madmona-app/scripts/reels/playwright || exit 1
true
mk() {
  slug="$1"
  D=$(ffprobe -v error -show_entries format=duration -of default=nw=1 "vo-$slug-lahajati.mp3" | cut -d= -f2)
  echo "$slug vo=$D"
  node _fit_reels.cjs "$slug" 2>&1 | tail -1
  node build-reels.js "$slug" 2>&1 | tail -1
  SEC=$(node -e "console.log(Math.ceil($D)+1)")
  curl -s -m 3 http://127.0.0.1:9222/json/version > /dev/null || { powershell -ExecutionPolicy Bypass -File launch-chrome-debug.ps1 > /dev/null 2>&1; sleep 6; }
  node record-url.js "file:///E:/madmona-app/scripts/reels/playwright/reels/reel-$slug.html" "$SEC" --audio "vo-$slug-lahajati.mp3" > "_rec_$slug.txt" 2>&1
  grep -E "\[url\] ✓" "_rec_$slug.txt" | tail -1
  f=$(ls -t output/reel-${slug}_html-*.mp4 | head -1)
  cp "$f" "output/reel-$slug-bahgat-egy.mp4" && ffprobe -v error -show_entries format=duration -of default=nw=1 "output/reel-$slug-bahgat-egy.mp4"
}
mk contracting-custody
mk realestate-agent-left
echo ALLDONE
