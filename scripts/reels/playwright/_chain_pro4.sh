#!/bin/bash
# 🚀 نشر القوالب الأربعة الجديدة (١٧/٩/٢٠٢٦ — محمد: «انشرهم كلهم على كل المنصات»)
# لكل فيديو: إعادة تشغيل كروم السوشيال → تيك توك + كومنت → شورتس + كومنت → إنستجرام → ثريدز (بتأكيد بالرابط الجديد)
cd /e/madmona-app/scripts/reels/playwright
restart_social(){ powershell -NoProfile -ExecutionPolicy Bypass -File _kill_social.ps1; sleep 3; powershell -NoProfile -ExecutionPolicy Bypass -File launch-chrome-social.ps1 >/dev/null 2>&1; for i in $(seq 1 30); do node -e "fetch('http://127.0.0.1:9223/json/version').then(()=>process.exit(0)).catch(()=>process.exit(1))" && break; sleep 2; done; sleep 20; }
for S in "$@"; do
  echo "######## $S $(date +%H:%M)"
  restart_social
  node _tt_probe2.cjs >/dev/null 2>&1; sleep 20
  node _tt_run.cjs $S > _tt_$S.txt 2>&1; echo "TT_RUN $?"; tail -2 _tt_$S.txt
  sleep 30
  TTU=$(node _tt_url.cjs 2>&1 | grep -o 'https://www.tiktok.com/@[^ "]*/video/[0-9]*' | head -1); echo "TT_URL $TTU"
  [ -n "$TTU" ] && { node _tt_comment.cjs "$TTU" $S >/dev/null 2>&1; echo "TT_COMMENT $?"; }
  restart_social
  node _yt_short.cjs $S > _yt_$S.txt 2>&1; echo "YT_EXIT $?"; tail -3 _yt_$S.txt
  YID=$(grep -o 'shorts/[A-Za-z0-9_-]\{11\}\|youtu.be/[A-Za-z0-9_-]\{11\}\|"id":"[A-Za-z0-9_-]\{11\}"' _yt_$S.txt | tail -1 | grep -o '[A-Za-z0-9_-]\{11\}"\?$' | tr -d '"'); echo "YT_ID $YID"
  [ -n "$YID" ] && { node _yt_comment.cjs $YID $S >/dev/null 2>&1; echo "YT_COMMENT $?"; }
  restart_social
  node posters/post-instagram-reel.cjs output/reel-$S.mp4 output/caption-$S-instagram.txt > _ig_$S.txt 2>&1; echo "IG_EXIT $?"; tail -2 _ig_$S.txt
  sleep 20
  PREV=$(node _threads_latest.cjs 2>&1 | grep -o '/post/[A-Za-z0-9_-]*' | head -1); echo "TH_PREV $PREV"
  node _threads_post.cjs $S > _th_$S.txt 2>&1; echo "TH_EXIT $?"
  NEW=""; for i in $(seq 1 12); do sleep 20; NEW=$(node _threads_latest.cjs 2>&1 | grep -o '/post/[A-Za-z0-9_-]*' | head -1); [ -n "$NEW" ] && [ "$NEW" != "$PREV" ] && break; NEW=""; done
  echo "TH_NEW $NEW"
done
echo "IG_CODES $(node _ig_stats.cjs 2>&1 | grep -o '"code":"[^"]*"' | head -4 | tr '\n' ' ')"
echo ALL_DONE
