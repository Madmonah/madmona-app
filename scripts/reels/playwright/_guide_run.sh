set -e
cd /e/madmona-app/scripts/reels/playwright
node -e "
const fs=require('fs');const p='reels.config.js';let s=fs.readFileSync(p,'utf8');
const i=s.indexOf(\"slug: 'full-guide'\"); if(i>0){const start=s.lastIndexOf('  {', i); const end=s.indexOf('  },', i)+4; s=s.slice(0,start)+s.slice(end).replace(/^\r?\n/,''); fs.writeFileSync(p,s); console.log('old entry removed');}"
node "C:/Users/SOLUTI~1/AppData/Local/Temp/claude/E--madmona-app/498aecfc-e274-4d1d-8105-7f21efbbe9e5/scratchpad/_guide_build.cjs"
node build-reels.js full-guide
LEN=$(cat guide/len.txt); echo "record $LEN"
node record-url.js "file:///E:/madmona-app/scripts/reels/playwright/reels/reel-full-guide.html" $LEN > _guide_rec.txt 2>&1
cat _guide_rec.txt | tail -3
REC=$(ls -t output/reel-full-guide_html-*.mp4 | head -1); echo "rec=$REC"
ffmpeg -y -v error -i "$REC" -i guide/full.mp3 -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=2[v]" -map "[v]" -map 1:a -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -shortest -movflags +faststart output/madmona-full-guide-gaber.mp4
echo "GUIDE READY $(stat -c %s output/madmona-full-guide-gaber.mp4)"
