#!/bin/bash
cd /e/madmona-app/scripts/reels/playwright
S=biz-farid-khamis-carpets
restart_social(){ powershell -NoProfile -ExecutionPolicy Bypass -File _kill_social.ps1; sleep 3; powershell -NoProfile -ExecutionPolicy Bypass -File launch-chrome-social.ps1 >/dev/null 2>&1; for i in $(seq 1 30); do node -e "fetch('http://127.0.0.1:9223/json/version').then(()=>process.exit(0)).catch(()=>process.exit(1))" && break; sleep 2; done; sleep 20; }
restart_social
node _tt_probe2.cjs; sleep 20
node _tt_run.cjs $S; echo "TT_RUN $?"
sleep 30
TTU=$(node _tt_url.cjs 2>&1 | grep -o 'https://www.tiktok.com/@[^ "]*/video/[0-9]*' | head -1); echo "TT_URL $TTU"
[ -n "$TTU" ] && node _tt_comment.cjs "$TTU" $S; echo "TT_COMMENT $?"
node _yt_short.cjs $S > _yt40.txt 2>&1; echo "YT_EXIT $?"; tail -5 _yt40.txt
YID=$(grep -o 'shorts/[A-Za-z0-9_-]\{11\}\|youtu.be/[A-Za-z0-9_-]\{11\}\|"id":"[A-Za-z0-9_-]\{11\}"' _yt40.txt | tail -1 | grep -o '[A-Za-z0-9_-]\{11\}$\|[A-Za-z0-9_-]\{11\}"$' | tr -d '"'); echo "YT_ID $YID"
if [ -n "$YID" ]; then node _yt_comment.cjs $YID $S; echo "YT_COMMENT $?"; node _yt_comment_text.cjs $YID "شكوى زبونك بتتسجّل فين؟ اكتب ١ ورق ٢ موبايل ٣ في دماغي 👇"; echo "YT_Q $?"; fi
echo DONE_TTYT
