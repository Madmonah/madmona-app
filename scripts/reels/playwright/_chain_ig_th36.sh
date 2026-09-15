#!/bin/bash
cd /e/madmona-app/scripts/reels/playwright
S=biz-osman-arab-contractors
restart_social(){ powershell -NoProfile -ExecutionPolicy Bypass -File _kill_social.ps1; sleep 3; powershell -NoProfile -ExecutionPolicy Bypass -File launch-chrome-social.ps1 >/dev/null 2>&1; for i in $(seq 1 30); do node -e "fetch('http://127.0.0.1:9223/json/version').then(()=>process.exit(0)).catch(()=>process.exit(1))" && break; sleep 2; done; sleep 20; }
PREV=$(node _threads_latest.cjs 2>&1 | grep -o '/post/[A-Za-z0-9_-]*' | head -1); echo "PREV $PREV"
restart_social
node posters/post-instagram-reel.cjs output/reel-$S.mp4 output/caption-$S-instagram.txt; echo "IG_EXIT $?"
sleep 20
echo "IG_CODES $(node _ig_stats.cjs 2>&1 | grep -o '"code":"[^"]*"' | head -2 | tr '\n' ' ')"
node _threads_post.cjs $S; echo "TH_EXIT $?"
NEW=""; for i in $(seq 1 12); do sleep 20; NEW=$(node _threads_latest.cjs 2>&1 | grep -o '/post/[A-Za-z0-9_-]*' | head -1); [ -n "$NEW" ] && [ "$NEW" != "$PREV" ] && break; NEW=""; done
if [ -z "$NEW" ]; then echo TH_RETRY; node _threads_post.cjs $S; for i in $(seq 1 12); do sleep 20; NEW=$(node _threads_latest.cjs 2>&1 | grep -o '/post/[A-Za-z0-9_-]*' | head -1); [ -n "$NEW" ] && [ "$NEW" != "$PREV" ] && break; NEW=""; done; fi
echo "TH_NEW $NEW"
echo DONE_IGTH
