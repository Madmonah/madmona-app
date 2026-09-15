#!/bin/bash
cd /e/madmona-app/scripts/reels/playwright
S=biz-uniqlo-basics
ffmpeg -y -loglevel error -i output/vo-$S-lahajati.wav -codec:a libmp3lame -b:a 128k output/vo-$S-lahajati.mp3 && cp output/vo-$S-lahajati.mp3 vo-$S-lahajati.mp3
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 output/vo-$S-lahajati.mp3); echo "dur $D"
node _fit_noir.cjs $S && node build-noir.js $S && node _add_wa_cta.cjs $S
R=$(node -e "console.log(Math.ceil($D+2))")
node record-url.js "file:///E:/madmona-app/scripts/reels/playwright/reels/noir-$S.html" $R --audio output/vo-$S-lahajati.mp3; echo "EXIT $?"
M=$(ls -t output/noir-${S}_html-*.mp4 | head -1)
ffmpeg -y -loglevel error -ss 1.6 -i "$M" -frames:v 1 output/_poster-$S.png
ffmpeg -y -loglevel error -i "$M" -i output/_poster-$S.png -filter_complex "[1:v]scale=iw:ih[p];[0:v][p]overlay=0:0:enable='lt(t,0.4)'[v]" -map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 20 -c:a copy output/reel-$S.mp4
cp output/reel-$S.mp4 output/reel-$S-bahgat-egy.mp4
echo "REEL $(ffprobe -v error -show_entries format=duration -of csv=p=0 output/reel-$S.mp4)"
node _tg_send.cjs $S 8731129863:AAFGr152JDqX0_mtnMv3e9BtIlYouy5SRX4
echo DONE
