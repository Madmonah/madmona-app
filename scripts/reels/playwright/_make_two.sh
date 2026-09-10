#!/usr/bin/env bash
# يسجّل ريلين ورا بعض: contracting-custody ثم realestate-agent-left (صوت بدر V2)
set -u
cd /e/madmona-app/scripts/reels/playwright || exit 1
FF=$(node -e "console.log(require('E:/madmona-app/node_modules/ffmpeg-static'))")
mk() {
  slug="$1"; url="$2"
  curl -sL "$url" -o "output/voice/$slug-badr.wav" || { echo "dl fail $slug"; return 1; }
  "$FF" -y -v error -i "output/voice/$slug-badr.wav" -c:a copy "vo-$slug-lahajati.mp3" || return 1
  D=$(ffprobe -v error -show_entries format=duration -of default=nw=1 "vo-$slug-lahajati.mp3" | cut -d= -f2)
  echo "$slug vo=$D"
  node _fit_reels.cjs "$slug" 2>&1 | tail -1
  node build-reels.js "$slug" 2>&1 | tail -1
  SEC=$(node -e "console.log(Math.ceil($D)+1)")
  curl -s -m 3 http://127.0.0.1:9222/json/version > /dev/null || { powershell -ExecutionPolicy Bypass -File launch-chrome-debug.ps1 > /dev/null 2>&1; sleep 6; }
  node record-url.js "file:///E:/madmona-app/scripts/reels/playwright/reels/reel-$slug.html" "$SEC" --audio "vo-$slug-lahajati.mp3" > "_rec_$slug.txt" 2>&1
  grep -E "\[url\] ✓" "_rec_$slug.txt" | tail -1
  f=$(ls -t output/reel-${slug}_html-*.mp4 | head -1)
  cp "$f" "output/reel-$slug-badr-egy.mp4" && ffprobe -v error -show_entries format=duration -of default=nw=1 "output/reel-$slug-badr-egy.mp4"
}
mk contracting-custody "https://lahajati.ai/audio_file?S3=audio_generate/423007/10-09-2026/8fb59babc4462ee507f54db3e92609ab/Voice-8fb59babc4462ee507f54db3e92609ab-10-09-2026-8fb59babc4462ee507f54db3e92609ab.wav"
mk realestate-agent-left "https://lahajati.ai/audio_file?S3=audio_generate/423007/10-09-2026/812e6005e4ac51a18b87e1011d83b495/Voice-812e6005e4ac51a18b87e1011d83b495-10-09-2026-812e6005e4ac51a18b87e1011d83b495.wav"
echo ALLDONE
